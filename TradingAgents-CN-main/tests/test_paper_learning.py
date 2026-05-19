"""
Regression tests for T6.1 — live-fitness scoring in evolve_account_plan.

Covered:
  - _live_fitness returns applicable=False when too few trades exist
  - _live_fitness returns applicable=False when too few equity snapshots
  - _live_fitness with a winning equity curve produces a positive score
  - _live_fitness with a losing curve produces a negative score
  - _blend_baseline_with_live: ignores live when not applicable
  - _blend_baseline_with_live: shifts baseline toward live when applicable
  - Migration: live_score_last column exists after init_paper_tables
"""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))


@pytest.fixture()
def pt(monkeypatch, tmp_path):
    import modules.paper_trading as m
    monkeypatch.setattr(m, '_DB', tmp_path / 'learn.db')
    m.init_paper_tables()
    return m


def _seed_account(pt, initial_capital=10000.0, start_date='2026-01-01'):
    with sqlite3.connect(str(pt._DB)) as c:
        cur = c.execute(
            "INSERT INTO paper_accounts "
            "(user_id, name, plan_json, initial_capital, cash, status, start_date, "
            " peak_equity, base_currency) "
            "VALUES (1, 'T', ?, ?, ?, 'active', ?, ?, 'USD')",
            (json.dumps({'strategies': ['ma_cross'], 'combine_mode': 'any'}),
             initial_capital, initial_capital, start_date, initial_capital))
        c.commit()
        return cur.lastrowid


def _seed_equity(pt, account_id, points):
    """Insert (date, equity) pairs into paper_equity_history."""
    with sqlite3.connect(str(pt._DB)) as c:
        for d, eq in points:
            c.execute(
                'INSERT INTO paper_equity_history (account_id, date, cash, positions_value, equity) '
                'VALUES (?, ?, ?, ?, ?)',
                (account_id, d, eq, 0, eq))
        c.commit()


def _seed_closed_trades(pt, account_id, pnl_pcts):
    with sqlite3.connect(str(pt._DB)) as c:
        for i, pnl in enumerate(pnl_pcts):
            c.execute(
                "INSERT INTO paper_positions "
                "(account_id, symbol, shares, entry_price, entry_date, status, "
                " exit_price, exit_date, exit_reason, pnl_abs, pnl_pct) "
                "VALUES (?, 'AAPL', 10, 100, '2026-01-01', 'closed', "
                "100, '2026-02-01', 'TP', 0, ?)",
                (account_id, pnl))
        c.commit()


# ---------- migration ----------

def test_live_score_last_column_exists(pt):
    """init_paper_tables must add the new column."""
    with sqlite3.connect(str(pt._DB)) as c:
        cols = [r[1] for r in c.execute('PRAGMA table_info(paper_accounts)').fetchall()]
    assert 'live_score_last' in cols


# ---------- _live_fitness ----------

def test_live_fitness_not_applicable_too_few_trades(pt):
    acct = _seed_account(pt)
    _seed_equity(pt, acct, [(f'2026-01-{d:02d}', 10000 + d * 50)
                            for d in range(1, 11)])
    _seed_closed_trades(pt, acct, [1.0, 2.0])  # only 2 trades
    out = pt._live_fitness(acct, since_iso=None, target_annual_pct=80.0)
    assert out['applicable'] is False
    assert 'closed trades' in out['reason']


def test_live_fitness_not_applicable_too_few_snapshots(pt):
    acct = _seed_account(pt)
    _seed_equity(pt, acct, [('2026-01-01', 10000), ('2026-01-02', 10100)])
    _seed_closed_trades(pt, acct, [1.0, 2.0, 3.0])  # enough trades
    out = pt._live_fitness(acct, since_iso=None, target_annual_pct=80.0)
    assert out['applicable'] is False
    assert 'snapshots' in out['reason']


def test_live_fitness_winning_curve_scores_positive(pt):
    acct = _seed_account(pt)
    # Linear-ish climb 10000 → 11000 over 30 days
    points = [(f'2026-01-{d:02d}', 10000 + 33 * d) for d in range(1, 31)]
    _seed_equity(pt, acct, points)
    _seed_closed_trades(pt, acct, [3.0, 4.0, 5.0, 2.0])
    out = pt._live_fitness(acct, since_iso=None, target_annual_pct=80.0)
    assert out['applicable'] is True
    assert out['n_trades'] == 4
    assert out['annual_return_pct'] > 0
    # A consistent uptrend usually yields a positive blended score
    assert out['score'] > 0, f"expected positive score, got {out}"


def test_live_fitness_losing_curve_scores_negative(pt):
    acct = _seed_account(pt)
    # Linear decline 10000 → 8500 over 30 days
    points = [(f'2026-01-{d:02d}', 10000 - 50 * d) for d in range(1, 31)]
    _seed_equity(pt, acct, points)
    _seed_closed_trades(pt, acct, [-3.0, -5.0, -2.0, -4.0])
    out = pt._live_fitness(acct, since_iso=None, target_annual_pct=80.0)
    assert out['applicable'] is True
    assert out['total_return_pct'] < 0
    # The -20 penalty for negative return should push score deeply negative
    assert out['score'] < 0


# ---------- _blend_baseline_with_live ----------

def test_blend_ignores_live_when_not_applicable(pt):
    score, annual, w = pt._blend_baseline_with_live(
        10.0, 5.0,
        {'applicable': False, 'reason': 'too few trades'},
    )
    assert score == 10.0
    assert annual == 5.0
    assert w == 0.0


def test_blend_shifts_toward_live(pt):
    """With weight=0.4, a baseline of 0 and live score of 100 should
    produce a blended score of 40."""
    live = {'applicable': True, 'score': 100.0, 'annual_return_pct': 50.0}
    score, annual, w = pt._blend_baseline_with_live(0.0, 0.0, live)
    assert w == pt._LIVE_FITNESS_WEIGHT
    # 0.6*0 + 0.4*100 = 40
    assert abs(score - 40.0) < 1e-6
    assert abs(annual - 20.0) < 1e-6


def test_blend_with_live_underperforming_baseline_drops(pt):
    """If live is much worse than the backtest predicted, the blend
    should drag the baseline score down — this is exactly what makes
    the optimizer 'learn from live trades'."""
    backtest_score = 50.0
    live = {'applicable': True, 'score': -50.0, 'annual_return_pct': -20.0}
    blended, _, _ = pt._blend_baseline_with_live(backtest_score, 30.0, live)
    # 0.6*50 + 0.4*(-50) = 30 - 20 = 10
    assert blended < backtest_score
    assert abs(blended - 10.0) < 1e-6
