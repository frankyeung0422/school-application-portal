"""
Observability primitives — /healthz, /metrics, scheduler heartbeat, DB durability.

Stdlib-only Prometheus exposition (text format v0.0.4). Avoiding the
``prometheus_client`` dependency keeps the requirements lean and lets the
metrics work in any deploy that has the stdlib http.server.

Reads in this module are best-effort: a failed metric collection must
never break the request — we'd rather emit a partial /metrics page than
500 the operator's dashboard.
"""
from __future__ import annotations

import logging
import sqlite3
import threading
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


logger = logging.getLogger('paper_trading')  # share the rotating file from paper_trading


# ---------------------------------------------------------------------------
# Heartbeat — written by the scheduler loop each iteration, read by /healthz.
# Plain ``time.time()`` float guarded by a Lock so concurrent reads/writes
# during a /healthz request don't see torn values.
# ---------------------------------------------------------------------------
_HB_LOCK = threading.Lock()
_HB_TS: float = 0.0
_HB_STATUS: str = 'starting'      # starting | ok | backoff | crashed


def heartbeat(status: str = 'ok') -> None:
    """Called from the scheduler at the top of every loop iteration."""
    global _HB_TS, _HB_STATUS
    with _HB_LOCK:
        _HB_TS = time.time()
        _HB_STATUS = status


def heartbeat_age_seconds() -> Optional[float]:
    with _HB_LOCK:
        if _HB_TS == 0.0:
            return None
        return time.time() - _HB_TS


def heartbeat_status() -> str:
    with _HB_LOCK:
        return _HB_STATUS


# ---------------------------------------------------------------------------
# In-process counters / histograms. Each metric is keyed by name; histograms
# use fixed buckets matching typical request latencies.
# Locks are per-metric so the hot tick path doesn't contend with /metrics.
# ---------------------------------------------------------------------------
_COUNTERS: Dict[str, int] = {}
_COUNTERS_LABELED: Dict[str, Dict[Tuple[Tuple[str, str], ...], int]] = {}
_COUNTER_LOCK = threading.Lock()

_HIST_BUCKETS = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, float('inf'))
_HISTOGRAMS: Dict[str, Dict[str, Any]] = {}
_HIST_LOCK = threading.Lock()


def counter_inc(name: str, value: int = 1, **labels: str) -> None:
    """Increment a counter (optionally with label dimensions)."""
    with _COUNTER_LOCK:
        if labels:
            key = tuple(sorted(labels.items()))
            bucket = _COUNTERS_LABELED.setdefault(name, {})
            bucket[key] = bucket.get(key, 0) + value
        else:
            _COUNTERS[name] = _COUNTERS.get(name, 0) + value


def histogram_observe(name: str, value: float) -> None:
    """Record one observation. Buckets are fixed at module load."""
    with _HIST_LOCK:
        h = _HISTOGRAMS.get(name)
        if h is None:
            h = {
                'count': 0, 'sum': 0.0,
                'buckets': [0] * len(_HIST_BUCKETS),
            }
            _HISTOGRAMS[name] = h
        h['count'] += 1
        h['sum'] += value
        for i, ub in enumerate(_HIST_BUCKETS):
            if value <= ub:
                h['buckets'][i] += 1


# ---------------------------------------------------------------------------
# Prometheus text exposition.
# ---------------------------------------------------------------------------
_HELP: Dict[str, str] = {
    'paper_ticks_total': 'Total run_account_tick invocations',
    'paper_evolutions_total': 'Total evolve_account_plan invocations',
    'paper_promotions_total': 'Total evolutions where a candidate plan was applied',
    'paper_errors_total': 'Total errors observed in the paper-trading pipeline',
    'paper_requests_total': 'Total HTTP requests served (audit-log derived)',
    'paper_scheduler_heartbeat_age_seconds': 'Seconds since the scheduler last ticked',
    'paper_scheduler_status': '1 if scheduler healthy, 0 otherwise',
    'request_latency_seconds': 'HTTP request latency distribution',
}


def _escape_label(v: str) -> str:
    return v.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')


def render_prometheus() -> str:
    """Return the /metrics body in Prometheus text format v0.0.4."""
    lines: List[str] = []
    # Plain counters
    with _COUNTER_LOCK:
        plain = dict(_COUNTERS)
        labeled = {k: dict(v) for k, v in _COUNTERS_LABELED.items()}
    # Emit HELP/TYPE once per metric name, but emit ALL series (plain and
    # labeled may coexist for the same metric — e.g. paper_ticks_total
    # and paper_ticks_total{outcome="ok"}).
    all_names = sorted(set(plain) | set(labeled))
    for name in all_names:
        if name in _HELP:
            lines.append(f'# HELP {name} {_HELP[name]}')
        lines.append(f'# TYPE {name} counter')
        if name in plain:
            lines.append(f'{name} {plain[name]}')
        for key, value in labeled.get(name, {}).items():
            label_str = ','.join(f'{k}="{_escape_label(v)}"' for k, v in key)
            lines.append(f'{name}{{{label_str}}} {value}')

    # Heartbeat gauge
    age = heartbeat_age_seconds()
    age_val = age if age is not None else -1
    lines.append(f'# HELP paper_scheduler_heartbeat_age_seconds {_HELP["paper_scheduler_heartbeat_age_seconds"]}')
    lines.append('# TYPE paper_scheduler_heartbeat_age_seconds gauge')
    lines.append(f'paper_scheduler_heartbeat_age_seconds {age_val}')
    status = heartbeat_status()
    lines.append(f'# HELP paper_scheduler_status {_HELP["paper_scheduler_status"]}')
    lines.append('# TYPE paper_scheduler_status gauge')
    lines.append(f'paper_scheduler_status{{status="{_escape_label(status)}"}} {1 if status == "ok" else 0}')

    # Histograms
    with _HIST_LOCK:
        hsnapshot = {k: {'count': v['count'], 'sum': v['sum'], 'buckets': list(v['buckets'])}
                     for k, v in _HISTOGRAMS.items()}
    for name, h in hsnapshot.items():
        if name in _HELP:
            lines.append(f'# HELP {name} {_HELP[name]}')
        lines.append(f'# TYPE {name} histogram')
        # buckets[i] is already cumulative — histogram_observe increments
        # every bucket where value <= ub, matching Prometheus semantics.
        for i, ub in enumerate(_HIST_BUCKETS):
            le_label = '+Inf' if ub == float('inf') else f'{ub}'
            lines.append(f'{name}_bucket{{le="{le_label}"}} {h["buckets"][i]}')
        lines.append(f'{name}_sum {h["sum"]}')
        lines.append(f'{name}_count {h["count"]}')

    lines.append('')   # trailing newline expected by Prometheus
    return '\n'.join(lines)


# ---------------------------------------------------------------------------
# /healthz — non-Prometheus, JSON. Used by container orchestrators and the
# dashboard banner. Returns 200 even when the system is degraded; the
# caller inspects status_flags / status to decide what to do.
# ---------------------------------------------------------------------------
def healthz(db_path: Path) -> Dict[str, Any]:
    """Snapshot of pipeline health. db_ok is a real query, not just path existence."""
    out: Dict[str, Any] = {
        'status': 'ok',
        'version': _read_version(),
        'scheduler_heartbeat_age_s': heartbeat_age_seconds(),
        'scheduler_status': heartbeat_status(),
        'db_ok': False,
        'last_tick_errors_24h': None,
        'open_accounts': None,
        'flags': [],
    }
    try:
        with sqlite3.connect(str(db_path), timeout=2.0) as c:
            c.row_factory = sqlite3.Row
            out['db_ok'] = bool(c.execute('SELECT 1').fetchone())
            # Last 24h error count from admin actions + last_tick_error stamps
            try:
                row = c.execute(
                    "SELECT COUNT(*) AS n FROM paper_admin_actions "
                    "WHERE action='evolution_blocked' AND ts > datetime('now', '-1 day')"
                ).fetchone()
                blocked = int(row['n']) if row else 0
            except sqlite3.OperationalError:
                blocked = 0
            try:
                row = c.execute(
                    'SELECT COUNT(*) AS n FROM paper_accounts WHERE last_tick_error IS NOT NULL'
                ).fetchone()
                stuck = int(row['n']) if row else 0
            except sqlite3.OperationalError:
                stuck = 0
            out['last_tick_errors_24h'] = blocked + stuck
            try:
                row = c.execute(
                    "SELECT COUNT(*) AS n FROM paper_accounts WHERE status='active'"
                ).fetchone()
                out['open_accounts'] = int(row['n']) if row else 0
            except sqlite3.OperationalError:
                pass
    except Exception as e:
        out['status'] = 'degraded'
        out['db_error'] = str(e)
        out['flags'].append('db_error')
    age = out['scheduler_heartbeat_age_s']
    if age is None:
        out['flags'].append('scheduler_never_ticked')
    elif age > 7200:
        out['status'] = 'degraded'
        out['flags'].append('scheduler_stale')
    if out['scheduler_status'] not in ('ok', 'starting'):
        out['flags'].append(f'scheduler_{out["scheduler_status"]}')
    return out


def _read_version() -> str:
    """Read the project VERSION file (or fall back to git short sha if absent)."""
    candidates = [
        Path(__file__).resolve().parents[2] / 'VERSION',
        Path(__file__).resolve().parents[1] / 'VERSION',
    ]
    for p in candidates:
        try:
            if p.exists():
                return p.read_text(encoding='utf-8').strip().split()[0]
        except Exception:
            continue
    return 'unknown'


# ---------------------------------------------------------------------------
# SQLite durability (T7.2) — used by paper_trading._conn() and the nightly
# scheduler. Exposed here so a single function defines our durability stance.
# ---------------------------------------------------------------------------
def apply_pragmas(conn: sqlite3.Connection) -> None:
    """Set WAL + NORMAL sync. Idempotent; safe to call on every connection.

    WAL = better read/write concurrency (readers don't block writers).
    synchronous=NORMAL = much faster than FULL, still safe against crashes
    (only loses transactions in flight at exact moment of power-loss).
    """
    try:
        conn.execute('PRAGMA journal_mode=WAL')
        conn.execute('PRAGMA synchronous=NORMAL')
        conn.execute('PRAGMA busy_timeout=5000')  # 5s for lock waits
    except Exception as e:
        # Non-fatal — older SQLite or RO mount might reject; we still want the conn
        logger.warning('apply_pragmas failed: %s', e, extra={'account': '-'})


def backup_db(src_path: Path, backup_dir: Path,
              keep_days: int = 14) -> Dict[str, Any]:
    """Snapshot ``src_path`` into ``backup_dir/YYYY-MM-DD.db`` using the
    SQLite ``backup`` API (consistent online snapshot, no lock contention).
    Then prune backups older than ``keep_days``. Runs ``PRAGMA integrity_check``
    on the snapshot.

    Returns ``{success, backup_path, integrity, pruned, error}``.
    """
    backup_dir.mkdir(parents=True, exist_ok=True)
    today = datetime.now().strftime('%Y-%m-%d')
    target = backup_dir / f'{today}.db'
    result: Dict[str, Any] = {
        'success': False, 'backup_path': str(target),
        'integrity': None, 'pruned': 0, 'error': None,
    }
    try:
        with sqlite3.connect(str(src_path), timeout=10.0) as src, \
             sqlite3.connect(str(target), timeout=10.0) as dst:
            src.backup(dst)
            row = dst.execute('PRAGMA integrity_check').fetchone()
            result['integrity'] = row[0] if row else None
        # Prune old backups
        cutoff = datetime.now() - timedelta(days=keep_days)
        pruned = 0
        for f in backup_dir.glob('*.db'):
            try:
                stem_dt = datetime.strptime(f.stem, '%Y-%m-%d')
            except ValueError:
                continue
            if stem_dt < cutoff:
                f.unlink()
                pruned += 1
        result['pruned'] = pruned
        result['success'] = (result['integrity'] == 'ok')
    except Exception as e:
        result['error'] = str(e)
    return result
