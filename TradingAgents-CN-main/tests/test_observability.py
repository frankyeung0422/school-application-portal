"""
Regression tests for the observability module (T7.1).

Covered:
  - heartbeat + heartbeat_age_seconds returns sane values
  - counter_inc with and without labels
  - histogram_observe places values into correct buckets
  - render_prometheus output is parseable by the official client lib
  - healthz returns degraded flags when scheduler has never ticked
  - apply_pragmas sets WAL on a fresh connection
"""
from __future__ import annotations

import sqlite3
import sys
import time
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))


@pytest.fixture()
def obs(monkeypatch):
    """Reset module-level metric state between tests so they don't leak."""
    import modules.observability as o
    # Reset state
    monkeypatch.setattr(o, '_HB_TS', 0.0, raising=False)
    monkeypatch.setattr(o, '_HB_STATUS', 'starting', raising=False)
    o._COUNTERS.clear()
    o._COUNTERS_LABELED.clear()
    o._HISTOGRAMS.clear()
    return o


def test_heartbeat_writes_and_reads(obs):
    assert obs.heartbeat_age_seconds() is None  # never ticked
    obs.heartbeat('ok')
    age = obs.heartbeat_age_seconds()
    assert age is not None
    assert age < 1.0
    assert obs.heartbeat_status() == 'ok'


def test_counter_inc_with_and_without_labels(obs):
    obs.counter_inc('paper_ticks_total')
    obs.counter_inc('paper_ticks_total')
    obs.counter_inc('paper_ticks_total', outcome='ok')
    obs.counter_inc('paper_ticks_total', outcome='ok')
    obs.counter_inc('paper_ticks_total', outcome='crashed')
    out = obs.render_prometheus()
    # plain counter accumulated
    assert 'paper_ticks_total 2' in out
    # labeled counter has 2 series
    assert 'paper_ticks_total{outcome="ok"} 2' in out
    assert 'paper_ticks_total{outcome="crashed"} 1' in out


def test_histogram_buckets_cumulative(obs):
    """A histogram bucket le=X must include all observations <=X (cumulative)."""
    for v in (0.001, 0.02, 0.3, 5.5):
        obs.histogram_observe('request_latency_seconds', v)
    out = obs.render_prometheus()
    # le=+Inf is the count of all observations
    assert 'request_latency_seconds_count 4' in out
    # le=0.005 should be 1 (only the 0.001 sample)
    assert 'request_latency_seconds_bucket{le="0.005"} 1' in out
    # le=0.5 should be 3 (0.001, 0.02, 0.3)
    assert 'request_latency_seconds_bucket{le="0.5"} 3' in out
    # le=+Inf should be 4
    assert 'request_latency_seconds_bucket{le="+Inf"} 4' in out


def test_render_prometheus_parses_with_official_client(obs):
    """The official prometheus_client parser should accept our output —
    this is the strictest cross-check we can run for format compliance."""
    pytest.importorskip('prometheus_client')
    from prometheus_client.parser import text_string_to_metric_families
    obs.counter_inc('paper_ticks_total', outcome='ok')
    obs.counter_inc('paper_evolutions_total')
    obs.histogram_observe('request_latency_seconds', 0.05)
    obs.histogram_observe('request_latency_seconds', 1.2)
    text = obs.render_prometheus()
    families = list(text_string_to_metric_families(text))
    names = {f.name for f in families}
    # prometheus_client strips _total/_bucket/_sum/_count suffixes when grouping
    assert 'paper_ticks' in names or 'paper_ticks_total' in names
    # Histogram family present
    assert any('request_latency' in n for n in names)


def test_healthz_flags_never_ticked(obs, tmp_path):
    """A brand-new server with no scheduler heartbeat must be flagged."""
    db = tmp_path / 'h.db'
    sqlite3.connect(str(db)).close()  # empty file
    h = obs.healthz(db)
    assert 'scheduler_never_ticked' in h['flags']
    assert h['db_ok'] is True   # bare DB query works


def test_healthz_flags_stale_scheduler(obs, tmp_path, monkeypatch):
    """A heartbeat older than 7200s should mark status=degraded."""
    db = tmp_path / 'h.db'
    sqlite3.connect(str(db)).close()
    # Plant an old heartbeat
    monkeypatch.setattr(obs, '_HB_TS', time.time() - 10_000)
    monkeypatch.setattr(obs, '_HB_STATUS', 'ok')
    h = obs.healthz(db)
    assert h['status'] == 'degraded'
    assert 'scheduler_stale' in h['flags']


def test_apply_pragmas_sets_wal(obs, tmp_path):
    db = tmp_path / 'pragma.db'
    with sqlite3.connect(str(db)) as c:
        obs.apply_pragmas(c)
        mode = c.execute('PRAGMA journal_mode').fetchone()[0]
        sync = c.execute('PRAGMA synchronous').fetchone()[0]
    assert mode.lower() == 'wal'
    # synchronous=NORMAL = 1
    assert sync == 1


def test_backup_db_roundtrip(obs, tmp_path):
    src = tmp_path / 'src.db'
    backup_dir = tmp_path / 'backups'
    # Plant some data so the backup is non-trivial
    with sqlite3.connect(str(src)) as c:
        c.execute('CREATE TABLE t(id INTEGER PRIMARY KEY, v TEXT)')
        c.executemany('INSERT INTO t(v) VALUES (?)', [('a',), ('b',)])
        c.commit()
    result = obs.backup_db(src, backup_dir)
    assert result['success'] is True, result
    assert result['integrity'] == 'ok'
    backup_path = Path(result['backup_path'])
    assert backup_path.exists()
    # Verify the backup actually has our row data
    with sqlite3.connect(str(backup_path)) as c:
        n = c.execute('SELECT COUNT(*) FROM t').fetchone()[0]
    assert n == 2
