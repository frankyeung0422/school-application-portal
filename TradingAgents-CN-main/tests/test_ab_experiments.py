"""
P5 regression tests — forward-validation experiments.

Run:
    PYTHONPATH=web python -m pytest tests/test_ab_experiments.py -v
"""
from __future__ import annotations

import json
import sqlite3
import sys
from datetime import date, timedelta
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))

TODAY = date.today().isoformat()


@pytest.fixture()
def env(monkeypatch, tmp_path):
    import modules.paper_trading as pt
    import modules.paper_options_follow as pof
    import modules.ab_experiments as ab
    db = tmp_path / 'exp.db'
    monkeypatch.setattr(pt, '_DB', db)
    monkeypatch.setattr(pof, '_DB', db)
    pt.init_paper_tables()
    pof.ensure_options_follow_table()
    ab.init_experiments_table()
    return pt, ab


def _fresh_scores(pt):
    import modules.ml_ranker as mr
    mr.init_ml_tables()
    with sqlite3.connect(str(pt._DB)) as c:
        c.execute("INSERT OR REPLACE INTO ml_rank_scores VALUES (?, 'AAPL', 1.0, 1, 'v')",
                  (TODAY,))
        c.commit()


# -------------------------------------------------------------- creation

def test_ranker_ab_refuses_without_scores(env):
    pt, ab = env
    res = ab.create_ranker_ab(user_id=1)
    assert not res['success']
    assert 'fresh scores' in res['error']


def test_ranker_ab_creates_twin_accounts(env):
    pt, ab = env
    _fresh_scores(pt)
    res = ab.create_ranker_ab(user_id=1, capital=5000)
    assert res['success'], res
    with sqlite3.connect(str(pt._DB)) as c:
        c.row_factory = sqlite3.Row
        a = c.execute('SELECT * FROM paper_accounts WHERE id=?',
                      (res['arm_a_account_id'],)).fetchone()
        b = c.execute('SELECT * FROM paper_accounts WHERE id=?',
                      (res['arm_b_account_id'],)).fetchone()
    pa, pb = json.loads(a['plan_json']), json.loads(b['plan_json'])
    assert pa['pick_source'] == 'heuristic'
    assert pb['pick_source'] == 'ml_ranker'
    # Identical otherwise — the A/B isolates exactly one variable.
    for k in set(pa) | set(pb):
        if k != 'pick_source':
            assert pa.get(k) == pb.get(k), k
    assert a['initial_capital'] == b['initial_capital'] == 5000
    assert a['auto_run'] == b['auto_run'] == 1


def test_playbook_trials_one_account_per_play(env):
    pt, ab = env
    res = ab.create_playbook_trials(user_id=1, plays=['index_csp', 'holdings_cc'])
    assert res['success'], res
    assert len(res['created']) == 2
    for item in res['created']:
        with sqlite3.connect(str(pt._DB)) as c:
            c.row_factory = sqlite3.Row
            acct = c.execute('SELECT * FROM paper_accounts WHERE id=?',
                             (item['account_id'],)).fetchone()
        plan = json.loads(acct['plan_json'])
        assert plan['options_engine'] == 'playbook'
        assert plan['options_plays'] == [item['play']]


# ------------------------------------------------------------- evaluation

def _backdate(ab_mod, pt, exp_id, days):
    old = (date.today() - timedelta(days=days)).isoformat()
    with sqlite3.connect(str(pt._DB)) as c:
        c.execute('UPDATE ab_experiments SET created_at=? WHERE id=?',
                  (old, exp_id))
        c.commit()


def _plant_equity(pt, acct, start_eq, end_eq):
    with sqlite3.connect(str(pt._DB)) as c:
        c.execute('INSERT OR REPLACE INTO paper_equity_history '
                  '(account_id, date, cash, positions_value, equity) '
                  "VALUES (?, '2026-05-01', 0, 0, ?)", (acct, start_eq))
        c.execute('INSERT OR REPLACE INTO paper_equity_history '
                  '(account_id, date, cash, positions_value, equity) '
                  'VALUES (?, ?, 0, 0, ?)', (acct, TODAY, end_eq))
        c.commit()


def _plant_trades(pt, acct, n):
    with sqlite3.connect(str(pt._DB)) as c:
        for _ in range(n):
            c.execute("INSERT INTO paper_positions (account_id, symbol, shares, "
                      "entry_price, entry_date, status, exit_date, pnl_abs, pnl_pct) "
                      "VALUES (?, 'AAPL', 1, 100, ?, 'closed', ?, 1, 1)",
                      (acct, TODAY, TODAY))
        c.commit()


def test_ranker_ab_passes_when_gate_met(env, monkeypatch):
    pt, ab = env
    _fresh_scores(pt)
    res = ab.create_ranker_ab(user_id=1)
    _backdate(ab, pt, res['experiment_id'], 30)
    _plant_equity(pt, res['arm_a_account_id'], 10000, 10100)   # +1%
    _plant_equity(pt, res['arm_b_account_id'], 10000, 10500)   # +5% — B wins
    _plant_trades(pt, res['arm_b_account_id'], 12)
    import modules.ml_ranker as mr
    monkeypatch.setattr(mr, 'confidence_state',
                        lambda: {'gate': 1.0, 'trailing_ic': 0.05})
    out = ab.evaluate_experiments()
    assert out['evaluated'] == 1
    exp = ab.list_experiments()[0]
    assert exp['status'] == 'passed'
    assert exp['verdict']['checks']['b_beats_a'] is True


def test_ranker_ab_fails_at_max_days_when_b_loses(env, monkeypatch):
    pt, ab = env
    _fresh_scores(pt)
    res = ab.create_ranker_ab(user_id=1)
    _backdate(ab, pt, res['experiment_id'], 60)                # past max_days
    _plant_equity(pt, res['arm_a_account_id'], 10000, 10500)
    _plant_equity(pt, res['arm_b_account_id'], 10000, 9900)    # B loses
    import modules.ml_ranker as mr
    monkeypatch.setattr(mr, 'confidence_state',
                        lambda: {'gate': 1.0, 'trailing_ic': 0.05})
    ab.evaluate_experiments()
    assert ab.list_experiments()[0]['status'] == 'failed'


def test_ranker_ab_keeps_running_before_min_days(env, monkeypatch):
    pt, ab = env
    _fresh_scores(pt)
    res = ab.create_ranker_ab(user_id=1)
    _backdate(ab, pt, res['experiment_id'], 5)
    import modules.ml_ranker as mr
    monkeypatch.setattr(mr, 'confidence_state',
                        lambda: {'gate': 1.0, 'trailing_ic': 0.05})
    ab.evaluate_experiments()
    exp = ab.list_experiments()[0]
    assert exp['status'] == 'running'
    assert exp['verdict']['elapsed_days'] == 5   # verdict updates while running


def test_options_play_trial_passes(env):
    pt, ab = env
    res = ab.create_playbook_trials(user_id=1, plays=['index_csp'])
    item = res['created'][0]
    _backdate(ab, pt, item['experiment_id'], 65)
    with sqlite3.connect(str(pt._DB)) as c:
        for _ in range(12):
            c.execute("INSERT INTO paper_option_positions (account_id, "
                      "opened_date, source, symbol, strategy, legs_json, "
                      "contracts, status, play_name, realized_pnl_usd) "
                      "VALUES (?, ?, 'playbook', 'SPY', 'cash_secured_put', "
                      "'[]', 1, 'settled', 'index_csp', 25.0)",
                      (item['account_id'], TODAY))
        c.commit()
    ab.evaluate_experiments()
    exp = [e for e in ab.list_experiments()
           if e['id'] == item['experiment_id']][0]
    assert exp['status'] == 'passed'
    assert exp['verdict']['arm']['options_realized_pnl_usd'] == pytest.approx(300.0)
