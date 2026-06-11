"""
P4 regression tests — purged OOS folds, strategy registry, kill switches.

Run:
    PYTHONPATH=web python -m pytest tests/test_promotion_discipline.py -v
"""
from __future__ import annotations

import json
import sqlite3
import sys
from datetime import date
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))

TODAY = date.today().isoformat()


# ---------------------------------------------------------------- OOS folds

def test_fold_count_adapts_to_period():
    import modules.autotrade_sim as ats
    _tr, folds_1y = ats.oos_fold_slices(365)
    _tr2, folds_2y = ats.oos_fold_slices(730)
    _tr5, folds_5y = ats.oos_fold_slices(1825)
    assert len(folds_1y) == 1
    assert len(folds_2y) == 2
    assert len(folds_5y) == 4


def test_train_slice_has_embargo_gap():
    import modules.autotrade_sim as ats
    train, folds = ats.oos_fold_slices(730, train_pct=0.7)
    assert train[1] < folds[0][0]          # purge gap between train and OOS
    assert folds[-1][1] == pytest.approx(1.0)
    # Folds are contiguous and non-overlapping.
    for a, b in zip(folds, folds[1:]):
        assert a[1] == pytest.approx(b[0])


def test_score_plan_oos_averages_folds(monkeypatch):
    import modules.autotrade_sim as ats

    def fake_sim(plan, slice_range=None):
        # Fold 1 scores high, fold 2 low — the mean must rank, not the max.
        ret = 40.0 if slice_range and slice_range[0] < 0.85 else -10.0
        return {'success': True, 'metrics': {
            'total_return_pct': ret, 'max_drawdown_pct': 5, 'sharpe': 1.0,
            'trade_count': 10, 'benchmark_total_pct': 0.0}}

    monkeypatch.setattr(ats, 'simulate_plan', fake_sim)
    res = ats.score_plan_oos({'period': '2y'}, target_annual_pct=50.0,
                             period_days=730)
    assert res['n_folds'] == 2
    assert len(res['fold_scores']) == 2
    # Mean sits strictly between the two single-fold scores.
    assert min(res['fold_scores']) < res['score'] < max(res['fold_scores'])


# ------------------------------------------------------------------ registry

@pytest.fixture()
def db(monkeypatch, tmp_path):
    import modules.paper_trading as pt
    monkeypatch.setattr(pt, '_DB', tmp_path / 'p4.db')
    pt.init_paper_tables()
    return pt


_PLAN = {'strategies': ['ma_cross'], 'combine_mode': 'any',
         'take_profit_pct': 10, 'stop_loss_pct': 5, 'pos_size_pct': 20,
         'fill_mode': 'next_close', 'pick_source': 'heuristic',
         'universe': 'sp500_top50'}


def test_register_idempotent_and_edit_resets(db):
    import modules.strategy_registry as sr
    r1 = sr.register(_PLAN)
    r2 = sr.register(_PLAN)
    assert r1['rule_hash'] == r2['rule_hash']
    assert r1['status'] == 'incubating'
    edited = dict(_PLAN, take_profit_pct=12)
    r3 = sr.register(edited)
    assert r3['rule_hash'] != r1['rule_hash']   # config edit = new identity


def _mk_account_with_trades(db, plan, n_trades, pnl_each):
    with sqlite3.connect(str(db._DB)) as c:
        cur = c.execute(
            "INSERT INTO paper_accounts (user_id, name, plan_json, "
            "initial_capital, cash, status, start_date, peak_equity, base_currency) "
            "VALUES (1, 'R', ?, 10000, 10000, 'active', ?, 10000, 'USD')",
            (json.dumps(plan), TODAY))
        acct = cur.lastrowid
        for _ in range(n_trades):
            c.execute(
                "INSERT INTO paper_positions (account_id, symbol, shares, "
                "entry_price, entry_date, status, exit_date, pnl_abs, pnl_pct) "
                "VALUES (?, 'AAPL', 1, 100, ?, 'closed', ?, ?, ?)",
                (acct, TODAY, TODAY, pnl_each, pnl_each))
        c.commit()
    return acct


def test_forward_counts_approve_at_200(db):
    import modules.strategy_registry as sr
    sr.register(_PLAN)
    _mk_account_with_trades(db, _PLAN, 210, +5.0)
    res = sr.update_forward_counts()
    assert res['approved'], res
    assert sr.is_approved(_PLAN)


def test_forward_counts_kill_negative_at_100(db):
    import modules.strategy_registry as sr
    plan = dict(_PLAN, take_profit_pct=15)
    sr.register(plan)
    _mk_account_with_trades(db, plan, 120, -3.0)
    res = sr.update_forward_counts()
    assert res['killed'], res
    assert sr.is_killed(plan)
    assert not sr.is_approved(plan)


def test_incubating_below_thresholds(db):
    import modules.strategy_registry as sr
    plan = dict(_PLAN, take_profit_pct=18)
    sr.register(plan)
    _mk_account_with_trades(db, plan, 30, +2.0)
    sr.update_forward_counts()
    assert sr.status_of(plan) == 'incubating'


# ------------------------------------------------------------ guardrail GR4

def test_guardrail_blocks_killed_config(db):
    import modules.strategy_registry as sr
    import modules.paper_learning as pl
    before = dict(_PLAN)
    after = dict(_PLAN, take_profit_pct=11)   # one-field change → GR3 passes
    sr.register(after)
    with sqlite3.connect(str(db._DB)) as c:
        c.execute("UPDATE strategy_registry SET status='killed' WHERE rule_hash=?",
                  (sr.plan_hash(after),))
        c.commit()
    res = pl.evolution_guardrails(
        account_id=1, before_plan=before, after_plan=after,
        backtest_max_dd_pct=10.0, live_max_dd_pct=None,
        regime_recent_flip=False)
    assert not res['passed']
    assert 'registry_killed_config' in res['blocks']


def test_guardrail_registers_fresh_config_and_passes(db):
    import modules.strategy_registry as sr
    import modules.paper_learning as pl
    before = dict(_PLAN)
    after = dict(_PLAN, stop_loss_pct=6)
    res = pl.evolution_guardrails(
        account_id=1, before_plan=before, after_plan=after,
        backtest_max_dd_pct=10.0, live_max_dd_pct=None,
        regime_recent_flip=False)
    assert res['passed'], res
    # Side effect: the proposal is now tracked as incubating.
    assert sr.status_of(after) == 'incubating'
