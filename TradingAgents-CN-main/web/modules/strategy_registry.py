"""
P4 — Forward-validation strategy registry.

Every configuration that gets promoted to live paper trading (equity plans,
options plays, ranker version flips) is registered under a hash of its
decision-relevant fields and then tracked forward:

    incubating → approved      n_trades >= APPROVE_MIN_TRADES under the
                               FROZEN config (any edit changes the hash and
                               restarts the count) and the pre-registered
                               kill criterion not tripped
    incubating/approved → killed
                               kill criterion tripped (default: cumulative
                               realized P&L < 0 once n >= kill_at_n)

What the statuses gate:
  - 'approved' is required for SCALE-UP decisions — flipping new-account
    defaults to a config, recommending it for real capital. It is NOT
    required for paper-account evolution (paper accounts trade a handful of
    times a month; demanding 200 live trades before any plan swap would
    freeze the learning loop — paper trading IS the incubation).
  - 'killed' is a hard block everywhere: evolution_guardrails refuses to
    re-promote a configuration that already died forward (without this,
    mutation sources can resurrect dead configs indefinitely).

The kill criterion is stored ON the row at registration time, so it cannot
be quietly relaxed after the strategy starts losing.
"""
from __future__ import annotations

import hashlib
import json
from datetime import date
from typing import Any, Dict, List, Optional

APPROVE_MIN_TRADES = 200
_DEFAULT_KILL = {'kill_at_n': 100, 'kill_if_total_pnl_below': 0.0}

# Plan fields that define an equity strategy's identity. Risk-control
# cosmetics (email flags, names) deliberately excluded.
_EQUITY_CORE_FIELDS = (
    'strategies', 'combine_mode', 'take_profit_pct', 'stop_loss_pct',
    'pos_size_pct', 'atr_stop_mult', 'trailing_stop_pct',
    'profit_ladder_pct', 'ladder_trim_fractions', 'fill_mode',
    'pick_source', 'universe',
)


def _conn():
    try:
        from . import paper_trading as _pt
    except Exception:
        from web.modules import paper_trading as _pt  # type: ignore
    return _pt._conn()


def init_registry_table() -> None:
    with _conn() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS strategy_registry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rule_hash TEXT UNIQUE NOT NULL,
            kind TEXT NOT NULL,              -- equity_plan | options_play | ranker_version
            config_json TEXT NOT NULL,
            frozen_at TEXT NOT NULL,
            n_trades INTEGER DEFAULT 0,
            total_pnl REAL DEFAULT 0,
            oos_metrics_json TEXT,
            kill_criteria_json TEXT NOT NULL,
            status TEXT DEFAULT 'incubating',  -- incubating | approved | killed
            updated_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_registry_status ON strategy_registry(status, kind);
        ''')
        c.commit()


def plan_hash(plan: Dict[str, Any], kind: str = 'equity_plan') -> str:
    """Stable hash of the decision-relevant config."""
    if kind == 'equity_plan':
        core = {k: plan.get(k) for k in _EQUITY_CORE_FIELDS}
    else:
        core = dict(plan)
    blob = json.dumps(core, sort_keys=True, default=str)
    return hashlib.sha256(f'{kind}:{blob}'.encode()).hexdigest()[:16]


def register(plan: Dict[str, Any], kind: str = 'equity_plan',
             oos_metrics: Optional[Dict[str, Any]] = None,
             kill_criteria: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Idempotent: registering an already-known config returns its row."""
    init_registry_table()
    h = plan_hash(plan, kind)
    today = date.today().isoformat()
    with _conn() as c:
        c.execute(
            '''INSERT OR IGNORE INTO strategy_registry
               (rule_hash, kind, config_json, frozen_at, oos_metrics_json,
                kill_criteria_json, status, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, 'incubating', ?)''',
            (h, kind, json.dumps(plan, default=str), today,
             json.dumps(oos_metrics or {}),
             json.dumps(kill_criteria or _DEFAULT_KILL), today))
        c.commit()
        row = c.execute('SELECT * FROM strategy_registry WHERE rule_hash=?',
                        (h,)).fetchone()
    return dict(row) if row else {}


def status_of(plan: Dict[str, Any], kind: str = 'equity_plan') -> Optional[str]:
    init_registry_table()
    with _conn() as c:
        row = c.execute('SELECT status FROM strategy_registry WHERE rule_hash=?',
                        (plan_hash(plan, kind),)).fetchone()
    return row['status'] if row else None


def is_killed(plan: Dict[str, Any], kind: str = 'equity_plan') -> bool:
    return status_of(plan, kind) == 'killed'


def is_approved(plan: Dict[str, Any], kind: str = 'equity_plan') -> bool:
    return status_of(plan, kind) == 'approved'


def update_forward_counts() -> Dict[str, Any]:
    """Nightly: tally each registered equity config's forward paper trades
    (positions closed at/after its frozen_at date, on accounts whose CURRENT
    plan hashes to it) and apply the frozen kill/approve criteria."""
    init_registry_table()
    today = date.today().isoformat()
    changed = {'approved': [], 'killed': [], 'updated': 0}
    with _conn() as c:
        regs = c.execute(
            "SELECT * FROM strategy_registry WHERE kind='equity_plan' "
            "AND status != 'killed'").fetchall()
        accounts = c.execute(
            "SELECT id, plan_json FROM paper_accounts WHERE status='active'"
        ).fetchall()
        acct_by_hash: Dict[str, List[int]] = {}
        for a in accounts:
            try:
                h = plan_hash(json.loads(a['plan_json']), 'equity_plan')
            except Exception:
                continue
            acct_by_hash.setdefault(h, []).append(int(a['id']))

        for reg in regs:
            ids = acct_by_hash.get(reg['rule_hash'])
            if not ids:
                continue
            ph = ','.join('?' * len(ids))
            row = c.execute(
                f'''SELECT COUNT(*) AS n, COALESCE(SUM(pnl_abs), 0) AS total
                    FROM paper_positions
                    WHERE account_id IN ({ph}) AND status='closed'
                      AND pnl_abs IS NOT NULL AND exit_date >= ?''',
                (*ids, reg['frozen_at'])).fetchone()
            n, total = int(row['n'] or 0), float(row['total'] or 0)
            try:
                kill = json.loads(reg['kill_criteria_json'] or '{}')
            except Exception:
                kill = dict(_DEFAULT_KILL)
            status = reg['status']
            if (n >= int(kill.get('kill_at_n', 100))
                    and total < float(kill.get('kill_if_total_pnl_below', 0.0))):
                status = 'killed'
                changed['killed'].append(reg['rule_hash'])
            elif n >= APPROVE_MIN_TRADES and status == 'incubating':
                status = 'approved'
                changed['approved'].append(reg['rule_hash'])
            c.execute(
                'UPDATE strategy_registry SET n_trades=?, total_pnl=?, '
                'status=?, updated_at=? WHERE id=?',
                (n, round(total, 2), status, today, reg['id']))
            changed['updated'] += 1
        c.commit()
    return {'success': True, **changed}


def list_registry(kind: Optional[str] = None,
                  limit: int = 100) -> List[Dict[str, Any]]:
    init_registry_table()
    with _conn() as c:
        if kind:
            rows = c.execute(
                'SELECT * FROM strategy_registry WHERE kind=? '
                'ORDER BY id DESC LIMIT ?', (kind, limit)).fetchall()
        else:
            rows = c.execute(
                'SELECT * FROM strategy_registry ORDER BY id DESC LIMIT ?',
                (limit,)).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        try:
            d['config'] = json.loads(d.pop('config_json') or '{}')
        except Exception:
            d['config'] = {}
        out.append(d)
    return out
