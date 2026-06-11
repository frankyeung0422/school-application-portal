"""
P6 regression tests — real-chain option marks + research-health digest.

The B-S fallback prices off realized vol and is blind to implied-vol moves;
these tests pin that marks prefer real chain mids and degrade to B-S only
when the chain can't serve every leg.

Run:
    PYTHONPATH=web python -m pytest tests/test_chain_marks.py -v
"""
from __future__ import annotations

import json
import sys
from datetime import date, timedelta
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))

EXPIRY = (date.today() + timedelta(days=40)).isoformat()


def _chain(calls=None, puts=None):
    return {'symbol': 'SPY', 'expiry': EXPIRY,
            'calls': calls or [], 'puts': puts or []}


def _row(strike, mid, side):
    return {'side': side, 'strike': float(strike), 'bid': mid * 0.95,
            'ask': mid * 1.05, 'mid': float(mid), 'last': float(mid),
            'implied_vol': 0.4, 'volume': 100, 'open_interest': 500,
            'spread_pct': 5.0, 'in_the_money': False, 'contract_symbol': 'X'}


def _patch_chain(monkeypatch, chain):
    import modules.option_chain as oc
    monkeypatch.setattr(oc, 'fetch_expirations', lambda sym, ttl=3600: [EXPIRY])
    monkeypatch.setattr(oc, 'fetch_chain', lambda sym, expiry=None, ttl=900: chain)


# ----------------------------------------------------- chain liability / MTM

def test_chain_liability_credit_spread(monkeypatch):
    import modules.options_rec_tracker as ort
    _patch_chain(monkeypatch, _chain(puts=[_row(100, 2.5, 'put'),
                                           _row(95, 1.0, 'put')]))
    legs = [{'action': 'sell', 'type': 'put', 'strike': 100},
            {'action': 'buy', 'type': 'put', 'strike': 95}]
    liab = ort._chain_liability_per_share('SPY', EXPIRY, legs)
    assert liab == pytest.approx(1.5)   # pay 2.5 to close short, get 1.0 for long


def test_mtm_uses_chain_and_sees_iv(monkeypatch):
    """Long straddle: chain mids carry the IV run-up that B-S-on-realized-vol
    cannot see. credit=-5 (debit), legs now worth 11 → MTM +600/contract."""
    import modules.options_rec_tracker as ort
    _patch_chain(monkeypatch, _chain(calls=[_row(100, 6.0, 'call')],
                                     puts=[_row(100, 5.0, 'put')]))
    row = {'symbol': 'SPY', 'expiry_date': EXPIRY, 'credit_per_share': -5.0,
           'legs_json': json.dumps([
               {'action': 'buy', 'type': 'call', 'strike': 100},
               {'action': 'buy', 'type': 'put', 'strike': 100}])}
    mtm = ort._mtm_per_contract(row, date.today().isoformat())
    assert mtm == pytest.approx(600.0)


def test_mtm_falls_back_to_bs_when_chain_missing(monkeypatch):
    import modules.options_rec_tracker as ort
    import modules.option_chain as oc
    monkeypatch.setattr(oc, 'fetch_expirations', lambda sym, ttl=3600: [])
    monkeypatch.setattr(ort, '_current_spot_and_vol', lambda sym: (100.0, 0.3))
    row = {'symbol': 'SPY', 'expiry_date': EXPIRY, 'credit_per_share': 2.0,
           'legs_json': json.dumps([
               {'action': 'sell', 'type': 'put', 'strike': 95}])}
    mtm = ort._mtm_per_contract(row, date.today().isoformat())
    assert mtm is not None   # B-S proxy still marks it


def test_mtm_falls_back_when_a_leg_unmarkable(monkeypatch):
    """One leg missing from the chain → the WHOLE position falls back to B-S
    (mixing chain and B-S marks across legs would fabricate spreads)."""
    import modules.options_rec_tracker as ort
    _patch_chain(monkeypatch, _chain(puts=[_row(100, 2.5, 'put')]))  # no 95 strike
    monkeypatch.setattr(ort, '_current_spot_and_vol', lambda sym: (100.0, 0.3))
    row = {'symbol': 'SPY', 'expiry_date': EXPIRY, 'credit_per_share': 1.0,
           'legs_json': json.dumps([
               {'action': 'sell', 'type': 'put', 'strike': 100},
               {'action': 'buy', 'type': 'put', 'strike': 95}])}
    legs = json.loads(row['legs_json'])
    assert ort._chain_liability_per_share('SPY', EXPIRY, legs) is None
    assert ort._mtm_per_contract(row, date.today().isoformat()) is not None


def test_expiry_tolerance_rejects_far_expiries(monkeypatch):
    import modules.options_rec_tracker as ort
    import modules.option_chain as oc
    far = (date.today() + timedelta(days=60)).isoformat()  # 20d from position expiry
    monkeypatch.setattr(oc, 'fetch_expirations', lambda sym, ttl=3600: [far])
    legs = [{'action': 'sell', 'type': 'put', 'strike': 100}]
    assert ort._chain_liability_per_share('SPY', EXPIRY, legs) is None


# -------------------------------------------------- playbook chain pricing

def test_price_legs_from_chain_snaps_and_prices(monkeypatch):
    import modules.options_playbook as opb
    import modules.option_chain as oc
    monkeypatch.setattr(oc, 'nearest_expiry', lambda sym, dte_hint: EXPIRY)
    monkeypatch.setattr(oc, 'fetch_chain',
                        lambda sym, expiry=None, ttl=900: _chain(
                            puts=[_row(99, 2.4, 'put'), _row(94, 0.9, 'put')]))
    legs = [{'action': 'sell', 'type': 'put', 'strike': 100.3, 'dte': 45},
            {'action': 'buy', 'type': 'put', 'strike': 94.8, 'dte': 45}]
    priced = opb._price_legs_from_chain('SPY', 45, legs)
    assert priced is not None
    assert priced['legs'][0]['strike'] == 99.0    # snapped to listed strikes
    assert priced['legs'][1]['strike'] == 94.0
    assert priced['net_credit'] == pytest.approx(1.5)
    assert priced['expiry'] == EXPIRY


def test_price_legs_rejects_degenerate_snap(monkeypatch):
    """Both spread legs snapping onto the SAME listed strike → reject."""
    import modules.options_playbook as opb
    import modules.option_chain as oc
    monkeypatch.setattr(oc, 'nearest_expiry', lambda sym, dte_hint: EXPIRY)
    monkeypatch.setattr(oc, 'fetch_chain',
                        lambda sym, expiry=None, ttl=900: _chain(
                            puts=[_row(97, 1.5, 'put')]))   # one strike only
    legs = [{'action': 'sell', 'type': 'put', 'strike': 100, 'dte': 45},
            {'action': 'buy', 'type': 'put', 'strike': 95, 'dte': 45}]
    assert opb._price_legs_from_chain('SPY', 45, legs) is None


# ----------------------------------------------------- digest research block

def test_digest_includes_research_health(monkeypatch, tmp_path):
    import sqlite3
    import modules.paper_trading as pt
    import modules.paper_options_follow as pof
    db = tmp_path / 'digest.db'
    monkeypatch.setattr(pt, '_DB', db)
    monkeypatch.setattr(pof, '_DB', db)
    pt.init_paper_tables()
    import modules.ab_experiments as ab
    import modules.ml_ranker as mr
    ab.init_experiments_table()
    mr.init_ml_tables()
    today = date.today().isoformat()
    with sqlite3.connect(str(db)) as c:
        c.execute("INSERT INTO paper_accounts (user_id, name, plan_json, "
                  "initial_capital, cash, status, start_date, peak_equity, "
                  "base_currency) VALUES (1, 'A', '{}', 10000, 10000, "
                  "'active', ?, 10000, 'USD')", (today,))
        c.execute("INSERT INTO ab_experiments (kind, name, user_id, created_at, "
                  "arm_a_account_id, gate_json, status, verdict_json) "
                  "VALUES ('options_play', 'PlayTrial index_csp', 1, ?, 1, "
                  "'{}', 'running', ?)",
                  (today, json.dumps({'elapsed_days': 3})))
        c.execute("INSERT INTO ml_ranker_metrics (train_date, rank_ic, "
                  "n_samples, n_holdout_dates, model_version) "
                  "VALUES (?, 0.038, 7080, 8, 'v1')", (today,))
        c.commit()
    digest = pt.build_daily_digest_for_user(1)
    rh = digest['research_health']
    assert rh['experiments'][0]['name'] == 'PlayTrial index_csp'
    assert rh['experiments'][0]['elapsed_days'] == 3
    assert rh['ranker_latest_ic'] == pytest.approx(0.038)
