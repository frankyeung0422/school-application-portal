"""
P7 regression tests — correlation-aware position sizing.

Run:
    PYTHONPATH=web python -m pytest tests/test_corr_sizing.py -v
"""
from __future__ import annotations

import json
import math
import random
import sqlite3
import sys
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))

N_BARS = 90


def _series_entry(closes):
    dates = [f'2026-0{1 + i // 28}-{(i % 28) + 1:02d}' for i in range(len(closes))]
    return {'dates': dates, 'closes': list(closes),
            'highs': [c * 1.001 for c in closes],
            'lows': [c * 0.999 for c in closes],
            'signals': [0] * len(closes), 'exit_signals': [0] * len(closes),
            'idx_by_date': {d: i for i, d in enumerate(dates)}, 'atr': 0.0}


def _wavy(seed, n=N_BARS):
    rng = random.Random(seed)
    closes = [100.0]
    for i in range(n - 1):
        closes.append(max(1.0, closes[-1] * (1 + 0.01 * math.sin(i / 3)
                                             + rng.gauss(0, 0.002))))
    return closes


# ----------------------------------------------------------- pure multiplier

def test_perfectly_correlated_hits_floor():
    import modules.paper_trading as pt
    closes = _wavy(1)
    series = {'A': _series_entry(closes), 'B': _series_entry(closes)}
    asof = series['A']['dates'][-1]
    mult = pt._corr_sizing_multiplier(series, 'B', ['A'], asof)
    assert mult == pytest.approx(pt._CORR_MIN_MULT)   # corr=1 → floor 0.5


def test_uncorrelated_full_size():
    import modules.paper_trading as pt
    rng = random.Random(42)
    a = [100.0]
    b = [100.0]
    for _ in range(N_BARS - 1):
        a.append(max(1.0, a[-1] * (1 + rng.gauss(0, 0.01))))
        b.append(max(1.0, b[-1] * (1 + rng.gauss(0, 0.01))))
    series = {'A': _series_entry(a), 'B': _series_entry(b)}
    asof = series['A']['dates'][-1]
    mult = pt._corr_sizing_multiplier(series, 'B', ['A'], asof)
    assert mult > 0.9   # independent noise → near-zero corr → ~no cut


def test_no_held_positions_neutral():
    import modules.paper_trading as pt
    series = {'A': _series_entry(_wavy(1))}
    assert pt._corr_sizing_multiplier(series, 'A', [], '2026-03-01') == 1.0


def test_flat_series_carries_no_information():
    import modules.paper_trading as pt
    series = {'A': _series_entry([100.0] * N_BARS),
              'B': _series_entry([100.0] * N_BARS)}
    asof = series['A']['dates'][-1]
    assert pt._corr_sizing_multiplier(series, 'B', ['A'], asof) == 1.0


def test_held_symbol_missing_from_series_neutral():
    import modules.paper_trading as pt
    series = {'B': _series_entry(_wavy(1))}
    asof = series['B']['dates'][-1]
    assert pt._corr_sizing_multiplier(series, 'B', ['GONE'], asof) == 1.0


# ----------------------------------------------------------- live tick wiring

@pytest.fixture()
def pt(monkeypatch, tmp_path):
    import modules.paper_trading as m
    monkeypatch.setattr(m, '_DB', tmp_path / 'corr.db')
    m.init_paper_tables()
    return m


def _run_two_symbol_tick(pt, monkeypatch, corr_on):
    """Two perfectly-correlated symbols fire BUY the same day; the second
    entry's trade value shows whether the correlation cut applied."""
    closes = _wavy(7)
    sigs = [0] * N_BARS
    for i in range(70, 76):
        sigs[i] = 1
    base = _series_entry(closes)

    def fake_signals_for(sym, plan, account_ccy='USD'):
        return (base['dates'], closes, base['highs'], base['lows'],
                list(sigs), [0] * N_BARS)

    monkeypatch.setattr(pt, '_signals_for', fake_signals_for)
    import modules.pro_calendar as cal
    monkeypatch.setattr(cal, '_fetch_calendar', lambda sym: None)

    plan = {
        'symbols': ['SYMA', 'SYMB'], 'strategies': ['ma_cross'],
        'combine_mode': 'any', 'ai_mode': 'manual', 'fill_mode': 'same_close',
        'pos_size_pct': 30, 'sizing_mode': 'fixed', 'vol_target_annual_pct': 0,
        'take_profit_pct': 0, 'stop_loss_pct': 0, 'atr_stop_mult': 0,
        'trailing_stop_pct': 0, 'profit_ladder_pct': [],
        'ladder_trim_fractions': [], 'max_per_name_pct': 100,
        'min_trade_value': 50, 'hold_cooldown_days': 0,
        'vix_gate_threshold': 0, 'mtf_gate': False, 'use_hmm_regime': False,
        'max_per_sector_pct': 0, 'vwap_chase_max_pct': 0,
        'vwap_undercut_max_pct': 0, 'corr_aware_sizing': corr_on,
    }
    with sqlite3.connect(str(pt._DB)) as c:
        cur = c.execute(
            "INSERT INTO paper_accounts (user_id, name, plan_json, "
            "initial_capital, cash, status, start_date, peak_equity, base_currency) "
            "VALUES (1, 'C', ?, 10000, 10000, 'active', ?, 10000, 'USD')",
            (json.dumps(plan), base['dates'][0]))
        acct = cur.lastrowid
        c.commit()
    res = pt._run_account_tick_impl(1, acct, until_date=base['dates'][-1])
    assert res.get('success'), res
    with sqlite3.connect(str(pt._DB)) as c:
        c.row_factory = sqlite3.Row
        rows = c.execute(
            "SELECT symbol, shares, entry_price FROM paper_positions "
            "WHERE account_id=? ORDER BY id", (acct,)).fetchall()
    return {r['symbol']: r['shares'] * r['entry_price'] for r in rows}


def test_tick_halves_second_correlated_entry(pt, monkeypatch):
    vals = _run_two_symbol_tick(pt, monkeypatch, corr_on=True)
    assert 'SYMA' in vals and 'SYMB' in vals
    # SYMA enters first (alphabetical) at full size; SYMB, perfectly
    # correlated with the now-held SYMA, gets the 0.5 floor cut.
    ratio = vals['SYMB'] / vals['SYMA']
    assert ratio == pytest.approx(0.5, rel=0.07)


def test_tick_legacy_flag_off_equal_sizes(pt, monkeypatch):
    vals = _run_two_symbol_tick(pt, monkeypatch, corr_on=False)
    ratio = vals['SYMB'] / vals['SYMA']
    assert ratio == pytest.approx(1.0, rel=0.05)


def test_create_account_defaults_corr_on(pt):
    res = pt.create_account(
        user_id=1, plan={'name': 'x', 'symbols': ['AAPL'], 'capital': 10000})
    assert res['success']
    assert res['plan']['corr_aware_sizing'] is True
