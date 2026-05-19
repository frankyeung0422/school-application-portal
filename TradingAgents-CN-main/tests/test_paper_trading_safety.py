"""
Regression tests for the paper-trading money-path safety changes (Track 1).

Covered:
  - Per-account tick lock: a concurrent second tick is rejected with
    success=False / 'tick already running' (was: silent double-buy).
  - Stale lock recovery: a tick_running stamp older than the staleness
    threshold is stolen by the next claimant rather than wedging the
    account forever.
  - Crash recovery: when _run_account_tick_impl raises, the public wrapper
    releases the lock, populates last_tick_error, returns success=False,
    and does NOT commit a half-finished day (rollback via the impl's
    `with _conn():` context manager).
  - Drawdown peak preservation on resume: peak_equity is NOT lowered when
    an account is resumed by default; explicit reset_peak=True opts in.
  - Admin audit trail: reset/resume/close each append a paper_admin_actions row.

Run from the repo root:
    PYTHONPATH=web python -m pytest tests/test_paper_trading_safety.py -v
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
import tempfile
import threading
from datetime import datetime, timedelta
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))


@pytest.fixture()
def isolated_db(monkeypatch, tmp_path):
    """Point paper_trading at a fresh temp DB so tests don't touch prod data."""
    db = tmp_path / 'test_paper.db'
    import modules.paper_trading as pt
    monkeypatch.setattr(pt, '_DB', db)
    pt.init_paper_tables()
    return db, pt


@pytest.fixture()
def fake_account(isolated_db):
    """Create a minimal active account with a plan that won't actually fetch."""
    db, pt = isolated_db
    plan = {
        'symbols': ['AAPL'], 'strategies': ['ma_cross'], 'combine_mode': 'any',
        'pos_size_pct': 20.0, 'take_profit_pct': 10.0, 'stop_loss_pct': 5.0,
        'ai_mode': 'manual',
    }
    with sqlite3.connect(str(db)) as c:
        cur = c.execute(
            "INSERT INTO paper_accounts "
            "(user_id, name, plan_json, initial_capital, cash, status, start_date, "
            " email_on_run, auto_run, peak_equity, base_currency) "
            "VALUES (1, 'T', ?, 10000, 10000, 'active', '2026-01-01', 0, 0, 10000, 'USD')",
            (json.dumps(plan),))
        c.commit()
        return cur.lastrowid


def test_claim_tick_is_atomic(fake_account, isolated_db):
    """Two concurrent _claim_tick calls — exactly one wins."""
    _, pt = isolated_db
    results = []
    barrier = threading.Barrier(2)

    def attempt():
        barrier.wait()
        results.append(pt._claim_tick(fake_account))

    threads = [threading.Thread(target=attempt) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert sorted(results) == [False, True], (
        f"expected exactly one winner, got {results}")
    # winner still holds the lock
    db = isolated_db[0]
    with sqlite3.connect(str(db)) as c:
        row = c.execute('SELECT tick_running FROM paper_accounts WHERE id=?',
                        (fake_account,)).fetchone()
        assert row[0] is not None, 'lock not held after claim'


def test_release_tick_clears_flag(fake_account, isolated_db):
    _, pt = isolated_db
    assert pt._claim_tick(fake_account) is True
    pt._release_tick(fake_account, error='boom')
    db = isolated_db[0]
    with sqlite3.connect(str(db)) as c:
        row = c.execute(
            'SELECT tick_running, last_tick_error FROM paper_accounts WHERE id=?',
            (fake_account,)).fetchone()
    assert row[0] is None
    assert row[1] == 'boom'


def test_stale_lock_is_stolen(fake_account, isolated_db):
    """A lock older than _TICK_STALE_SECS must be claimable by the next caller."""
    db, pt = isolated_db
    # Plant a stale stamp directly
    stale = (datetime.now() - timedelta(seconds=pt._TICK_STALE_SECS + 60)).isoformat()
    with sqlite3.connect(str(db)) as c:
        c.execute('UPDATE paper_accounts SET tick_running=? WHERE id=?',
                  (stale, fake_account))
        c.commit()
    # Next claim must succeed (stale stamp gets overwritten).
    assert pt._claim_tick(fake_account) is True


def test_fresh_lock_blocks_second_claim(fake_account, isolated_db):
    _, pt = isolated_db
    assert pt._claim_tick(fake_account) is True
    # Second attempt sees a fresh (non-stale) stamp and must lose.
    assert pt._claim_tick(fake_account) is False


def test_crash_in_impl_releases_lock_and_records_error(fake_account, isolated_db, monkeypatch):
    """If _run_account_tick_impl raises, the wrapper must:
       1) return success=False with the error text,
       2) clear tick_running,
       3) stamp last_tick_error so the dashboard can show it."""
    _, pt = isolated_db

    def boom(*a, **kw):
        raise RuntimeError("yfinance hung on bar 42")
    monkeypatch.setattr(pt, '_run_account_tick_impl', boom)

    result = pt.run_account_tick(1, fake_account)
    assert result['success'] is False
    assert 'yfinance hung' in result['error']

    db = isolated_db[0]
    with sqlite3.connect(str(db)) as c:
        row = c.execute(
            'SELECT tick_running, last_tick_error FROM paper_accounts WHERE id=?',
            (fake_account,)).fetchone()
    assert row[0] is None, 'lock should be released after crash'
    assert row[1] is not None and 'yfinance hung' in row[1]


def test_concurrent_tick_rejected(fake_account, isolated_db, monkeypatch):
    """Lock the account, then attempt another tick — must be rejected
    with a specific error string (not a silent double-execution)."""
    _, pt = isolated_db
    assert pt._claim_tick(fake_account) is True
    # Sanity: with the lock held, the public wrapper bails before impl runs.
    called = []
    monkeypatch.setattr(pt, '_run_account_tick_impl',
                        lambda *a, **kw: called.append(1) or {'success': True})
    result = pt.run_account_tick(1, fake_account)
    assert result['success'] is False
    assert 'tick already running' in result['error']
    assert called == [], 'impl must not have been called'


def test_resume_preserves_peak_by_default(fake_account, isolated_db):
    """Default resume keeps the original peak — fixes the audited bug
    where sequential drawdowns after a pause weren't detected."""
    db, pt = isolated_db
    # Mark account as paused with peak=20000 but current equity 12000.
    with sqlite3.connect(str(db)) as c:
        c.execute(
            "UPDATE paper_accounts SET status='paused_drawdown', peak_equity=20000 WHERE id=?",
            (fake_account,))
        c.execute(
            'INSERT INTO paper_equity_history (account_id, date, cash, positions_value, equity) '
            'VALUES (?, ?, ?, ?, ?)',
            (fake_account, '2026-02-01', 12000, 0, 12000))
        c.commit()

    out = pt.resume_account(1, fake_account)
    assert out['success'] is True
    assert out['new_peak_equity'] == 20000.0, (
        'default resume must preserve all-time peak; got '
        f"{out['new_peak_equity']}")
    assert out['reset_peak'] is False


def test_resume_with_reset_peak_zeros_to_current(fake_account, isolated_db):
    db, pt = isolated_db
    with sqlite3.connect(str(db)) as c:
        c.execute(
            "UPDATE paper_accounts SET status='paused_drawdown', peak_equity=20000 WHERE id=?",
            (fake_account,))
        c.execute(
            'INSERT INTO paper_equity_history (account_id, date, cash, positions_value, equity) '
            'VALUES (?, ?, ?, ?, ?)',
            (fake_account, '2026-02-01', 12000, 0, 12000))
        c.commit()

    out = pt.resume_account(1, fake_account, reset_peak=True)
    assert out['new_peak_equity'] == 12000.0
    assert out['reset_peak'] is True


def test_admin_audit_trail_records_actions(fake_account, isolated_db):
    db, pt = isolated_db
    # Plant some equity history so close has something to liquidate-or-not.
    with sqlite3.connect(str(db)) as c:
        c.execute(
            "UPDATE paper_accounts SET status='paused_drawdown', peak_equity=15000 WHERE id=?",
            (fake_account,))
        c.commit()

    pt.resume_account(1, fake_account)
    pt.reset_account(1, fake_account)
    pt.close_account(1, fake_account)

    with sqlite3.connect(str(db)) as c:
        rows = c.execute(
            'SELECT action FROM paper_admin_actions WHERE account_id=? ORDER BY id',
            (fake_account,)).fetchall()
    actions = [r[0] for r in rows]
    assert actions == ['resume', 'reset', 'close'], (
        f"expected exactly [resume, reset, close], got {actions}")
