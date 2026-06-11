"""
P3 regression tests — options playbook lifecycle management.

Covered:
  - Each mechanical close rule (credit50 / dte / stop2x / event) against
    planted positions with stubbed MTM.
  - Long-straddle settlement math (debit play, |spot−K| payoff).
  - Playbook generation: recs carry frozen management rules; IV rank scales
    size only; killed plays are excluded.
  - Pre-registered kill criterion (100+ trades cumulatively negative).

Run:
    PYTHONPATH=web python -m pytest tests/test_options_playbook.py -v
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
    db = tmp_path / 'opt.db'
    monkeypatch.setattr(pt, '_DB', db)
    monkeypatch.setattr(pof, '_DB', db)
    pt.init_paper_tables()
    pof.ensure_options_follow_table()
    return pt, pof


def _mk_account(pof, plays=('index_put_credit_spread',)):
    plan = {'ai_mode': 'options_follow', 'options_engine': 'playbook',
            'options_top_n': 3, 'options_plays': list(plays),
            'options_alloc_pct': 20, 'options_max_contracts': 5}
    with sqlite3.connect(str(pof._DB)) as c:
        cur = c.execute(
            "INSERT INTO paper_accounts (user_id, name, plan_json, "
            "initial_capital, cash, status, start_date, peak_equity, base_currency) "
            "VALUES (1, 'O', ?, 10000, 10000, 'active', ?, 10000, 'USD')",
            (json.dumps(plan), TODAY))
        c.commit()
        return cur.lastrowid


def _plant_position(pof, acct, *, strategy='bull_put_spread', credit=1.0,
                    max_profit=100.0, contracts=1, collateral=400.0,
                    expiry_days=40, rule_frac=0.5, rule_dte=21,
                    rule_stop=2.0, event_close=None, play='index_put_credit_spread'):
    expiry = (date.today() + timedelta(days=expiry_days)).isoformat()
    legs = [{'action': 'sell', 'type': 'put', 'strike': 100, 'dte': expiry_days},
            {'action': 'buy', 'type': 'put', 'strike': 95, 'dte': expiry_days}]
    with sqlite3.connect(str(pof._DB)) as c:
        cur = c.execute(
            '''INSERT INTO paper_option_positions
               (account_id, opened_date, source, symbol, strategy, legs_json,
                contracts, spot_at_open, credit_per_share, max_profit_usd,
                max_loss_usd, cap_at_risk_usd, collateral_usd, expiry_date,
                status, play_name, event_close_date, rule_profit_frac,
                rule_dte, rule_stop_mult)
               VALUES (?, ?, 'playbook', 'SPY', ?, ?, ?, 100, ?, ?, 400, 400,
                       ?, ?, 'open', ?, ?, ?, ?, ?)''',
            (acct, TODAY, strategy, json.dumps(legs), contracts, credit,
             max_profit, collateral, expiry, play, event_close,
             rule_frac, rule_dte, rule_stop))
        c.commit()
        return cur.lastrowid


def _run_tick(pof, monkeypatch, acct, mtm_per_contract):
    import modules.options_rec_tracker as ort
    import modules.options_playbook as opb
    monkeypatch.setattr(ort, '_mtm_per_contract',
                        lambda row, today: mtm_per_contract)
    monkeypatch.setattr(ort, '_fetch_spot_at', lambda sym, d: 100.0)
    monkeypatch.setattr(opb, 'generate_recommendations',
                        lambda *a, **k: [])
    return pof.run_follow_tick_impl(1, acct, TODAY)


def _position(pof, pos_id):
    with sqlite3.connect(str(pof._DB)) as c:
        c.row_factory = sqlite3.Row
        return c.execute('SELECT * FROM paper_option_positions WHERE id=?',
                         (pos_id,)).fetchone()


# ------------------------------------------------------------- close rules

def test_credit50_closes_at_half_max_profit(env, monkeypatch):
    pt, pof = env
    acct = _mk_account(pof)
    pos = _plant_position(pof, acct)          # max_profit 100/contract
    res = _run_tick(pof, monkeypatch, acct, mtm_per_contract=60.0)
    assert res['success'], res
    assert res['managed'] == 1
    row = _position(pof, pos)
    assert row['status'] == 'settled'
    assert row['close_rule'] == 'credit50'
    assert row['realized_pnl_usd'] == pytest.approx(60.0)


def test_stop2x_closes_on_2x_credit_loss(env, monkeypatch):
    pt, pof = env
    acct = _mk_account(pof)
    pos = _plant_position(pof, acct)          # credit_total = 1.0*100 = $100
    res = _run_tick(pof, monkeypatch, acct, mtm_per_contract=-250.0)
    assert res['managed'] == 1
    row = _position(pof, pos)
    assert row['close_rule'] == 'stop2x'
    assert row['realized_outcome'] == 'loss'


def test_dte21_management(env, monkeypatch):
    pt, pof = env
    acct = _mk_account(pof)
    pos = _plant_position(pof, acct, expiry_days=15)   # inside the 21-DTE window
    res = _run_tick(pof, monkeypatch, acct, mtm_per_contract=10.0)
    assert res['managed'] == 1
    row = _position(pof, pos)
    assert row['close_rule'] == 'dte21'


def test_healthy_position_left_open(env, monkeypatch):
    pt, pof = env
    acct = _mk_account(pof)
    pos = _plant_position(pof, acct)          # 40 DTE, small profit
    res = _run_tick(pof, monkeypatch, acct, mtm_per_contract=20.0)
    assert res['managed'] == 0
    assert _position(pof, pos)['status'] == 'open'


def test_event_close_for_straddle(env, monkeypatch):
    pt, pof = env
    acct = _mk_account(pof, plays=('preearnings_straddle',))
    pos = _plant_position(
        pof, acct, strategy='long_straddle', credit=-5.0, max_profit=0,
        collateral=500.0, rule_frac=0, rule_dte=0, rule_stop=0,
        event_close=TODAY, play='preearnings_straddle')
    res = _run_tick(pof, monkeypatch, acct, mtm_per_contract=150.0)
    assert res['managed'] == 1
    row = _position(pof, pos)
    assert row['close_rule'] == 'event'
    assert row['realized_pnl_usd'] == pytest.approx(150.0)


# ------------------------------------------------------- straddle settlement

def test_long_straddle_settle_math():
    import modules.options_rec_tracker as ort
    row = {'legs_json': json.dumps([
        {'action': 'buy', 'type': 'call', 'strike': 100, 'dte': 10},
        {'action': 'buy', 'type': 'put', 'strike': 100, 'dte': 10}]),
        'credit_per_share': -5.0, 'strategy': 'long_straddle',
        'spot_at_open': 100.0}
    pnl, outcome = ort._compute_realized_pnl(row, 112.0)
    assert pnl == pytest.approx(700.0)   # |112-100| - 5 = +7/share
    assert outcome == 'win'
    pnl, outcome = ort._compute_realized_pnl(row, 102.0)
    assert pnl == pytest.approx(-300.0)  # 2 - 5 = -3/share
    assert outcome == 'loss'


# ------------------------------------------------------- playbook generation

def _stub_market(monkeypatch, closes_last=100.0):
    import modules.options_playbook as opb
    closes = [closes_last * (1 + 0.0002 * i) for i in range(260)]
    monkeypatch.setattr(opb, '_fetch',
                        lambda sym, period: (['d'] * 260, closes, closes, closes))
    monkeypatch.setattr(opb, '_real_chain_price', lambda *a, **k: None)
    # P6 — keep tests hermetic: no live chain lookups, B-S fallback path.
    monkeypatch.setattr(opb, '_price_legs_from_chain', lambda *a, **k: None)


def test_index_plays_generate_with_frozen_rules(env, monkeypatch):
    pt, pof = env
    import modules.options_playbook as opb
    _stub_market(monkeypatch)
    recs = opb.generate_recommendations(
        1, 1, top_n=5, plays=['index_csp', 'index_put_credit_spread'],
        target_iso=TODAY)
    assert recs, 'expected index recs'
    by_play = {}
    for r in recs:
        by_play.setdefault(r['play_name'], []).append(r)
    assert set(by_play) <= {'index_csp', 'index_put_credit_spread'}
    for r in by_play.get('index_put_credit_spread', []):
        assert r['close_rule_profit_frac'] == 0.5
        assert r['close_rule_dte'] == 21
        assert r['close_rule_stop_credit_mult'] == 2.0
        assert r['credit_per_share'] > 0
        assert r['alloc_scale'] in (0.5, 1.0)
    for r in by_play.get('index_csp', []):
        assert r['cap_at_risk_usd'] == pytest.approx(
            r['legs'][0]['strike'] * 100, rel=1e-6)


def test_straddle_generation_and_event_date(env, monkeypatch):
    pt, pof = env
    import modules.options_playbook as opb
    import modules.pro_calendar as pc
    _stub_market(monkeypatch)
    monkeypatch.setattr(
        pc, '_fetch_calendar',
        lambda sym: ({'next_event_type': 'earnings_date', 'next_event_days': 3}
                     if sym == 'AAPL' else None))
    recs = opb.generate_recommendations(
        1, 1, plays=['preearnings_straddle'], target_iso=TODAY)
    assert len(recs) == 1
    r = recs[0]
    assert r['symbol'] == 'AAPL'
    assert r['strategy'] == 'long_straddle'
    assert r['credit_per_share'] < 0          # debit play
    assert r['event_close_date'] == (date.today() + timedelta(days=3)).isoformat()
    assert r['close_rule_stop_credit_mult'] == 0  # exits on event, not stops


def test_avoid_list_plays_never_generate(env, monkeypatch):
    import modules.options_playbook as opb
    _stub_market(monkeypatch)
    recs = opb.generate_recommendations(
        1, 1, plays=['zero_dte_premium', 'earnings_short_premium'],
        target_iso=TODAY)
    assert recs == []


# ------------------------------------------------------------- kill switch

def test_kill_criterion_disables_play(env):
    pt, pof = env
    import modules.options_playbook as opb
    acct = _mk_account(pof)
    with sqlite3.connect(str(pof._DB)) as c:
        for i in range(105):
            c.execute(
                '''INSERT INTO paper_option_positions
                   (account_id, opened_date, source, symbol, strategy,
                    legs_json, contracts, status, play_name, realized_pnl_usd)
                   VALUES (?, ?, 'playbook', 'SPY', 'bull_put_spread', '[]',
                           1, 'settled', 'index_put_credit_spread', ?)''',
                (acct, TODAY, -10.0 if i % 2 else 5.0))  # net negative
        c.commit()
    res = opb.update_strategy_stats()
    assert res['plays']['index_put_credit_spread']['status'] == 'killed'
    assert 'index_put_credit_spread' in opb.disabled_plays()
    # And generation respects the kill regardless of the account plan.
    recs = opb.generate_recommendations(
        1, acct, plays=['index_put_credit_spread'], target_iso=TODAY)
    assert recs == []
