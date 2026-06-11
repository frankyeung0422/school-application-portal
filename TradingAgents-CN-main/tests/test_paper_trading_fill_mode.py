"""
P1a regression tests — lagged-signal fill (look-ahead fix).

fill_mode='next_close' must act on bar i-1's signal at bar i's close, in BOTH
engines (autotrade_sim backtester and the live paper_trading tick loop), while
fill_mode='same_close' preserves the legacy same-bar fill for pre-fix accounts.

Run:
    PYTHONPATH=web python -m pytest tests/test_paper_trading_fill_mode.py -v
"""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))


# ---------------------------------------------------------------- fixtures

N_BARS = 90
SIG_ON = 70   # signal turns 1 on this bar (computed from its close)
SIG_OFF = 76  # signal back to 0 on this bar


def _synthetic_series():
    """90 bars, flat 100 except distinctive closes around the trigger bars so
    same-bar vs next-bar fills land at visibly different prices."""
    dates = [f'2026-0{1 + i // 28}-{(i % 28) + 1:02d}' for i in range(N_BARS)]
    closes = [100.0] * N_BARS
    closes[SIG_ON] = 100.0
    closes[SIG_ON + 1] = 110.0   # next_close entry fill
    closes[SIG_OFF] = 120.0      # same_close exit fill
    closes[SIG_OFF + 1] = 130.0  # next_close exit fill
    highs = [c * 1.001 for c in closes]
    lows = [c * 0.999 for c in closes]
    return dates, closes, highs, lows


def _signal_array():
    sigs = [0] * N_BARS
    for i in range(SIG_ON, SIG_OFF):
        sigs[i] = 1
    return sigs


def _bare_plan(fill_mode):
    """No TP/SL/ATR/trailing/ladder so the only exit path is the signal cross."""
    return {
        'symbols': ['TEST'], 'strategies': ['ma_cross'], 'combine_mode': 'any',
        'period': '1y', 'capital': 10000,
        'take_profit_pct': 0, 'stop_loss_pct': 0, 'atr_stop_mult': 0,
        'trailing_stop_pct': 0, 'profit_ladder_pct': [], 'ladder_trim_fractions': [],
        'min_trade_value': 50, 'hold_cooldown_days': 0,
        'fill_mode': fill_mode,
    }


@pytest.fixture()
def sim(monkeypatch):
    import modules.autotrade_sim as ats
    import modules.paper_trading as pt
    dates, closes, highs, lows = _synthetic_series()
    monkeypatch.setattr(ats, '_fetch', lambda sym, period: (dates, closes, highs, lows))
    monkeypatch.setattr(ats, '_combine_signals',
                        lambda strats, mode, c, h, l: _signal_array())
    # _simulate_symbol re-imports _build_exit_signals from paper_trading at
    # call time, so patching the source module attribute is enough.
    monkeypatch.setattr(pt, '_build_exit_signals',
                        lambda strats, mode, c, h, l: [0] * N_BARS)
    return ats


# ---------------------------------------------------------------- backtester

def test_same_close_fills_on_trigger_bar(sim):
    res = sim._simulate_symbol('TEST', _bare_plan('same_close'), 10000.0)
    assert res['success']
    trades = res['trades']
    assert trades, 'expected at least one round trip'
    dates = _synthetic_series()[0]
    assert trades[0]['entry_date'] == dates[SIG_ON]
    assert trades[0]['entry_price'] == pytest.approx(100.0)
    # 1→0 cross on SIG_OFF closes the position that same bar (legacy).
    assert trades[0]['exit_date'] == dates[SIG_OFF]
    assert trades[0]['exit_price'] == pytest.approx(120.0)


def test_next_close_fills_one_bar_later(sim):
    res = sim._simulate_symbol('TEST', _bare_plan('next_close'), 10000.0)
    assert res['success']
    trades = res['trades']
    assert trades, 'expected at least one round trip'
    dates = _synthetic_series()[0]
    # Signal computed on SIG_ON's close → fill at SIG_ON+1's close (110).
    assert trades[0]['entry_date'] == dates[SIG_ON + 1]
    assert trades[0]['entry_price'] == pytest.approx(110.0)
    # 1→0 cross observed on SIG_OFF's close → exit at SIG_OFF+1 (130).
    assert trades[0]['exit_date'] == dates[SIG_OFF + 1]
    assert trades[0]['exit_price'] == pytest.approx(130.0)


def test_missing_fill_mode_defaults_to_legacy(sim):
    """Plans created before the field existed must behave exactly as before."""
    plan = _bare_plan('same_close')
    del plan['fill_mode']
    res = sim._simulate_symbol('TEST', plan, 10000.0)
    legacy = sim._simulate_symbol('TEST', _bare_plan('same_close'), 10000.0)
    assert res['trades'] == legacy['trades']


# ---------------------------------------------------------------- live engine

@pytest.fixture()
def pt(monkeypatch, tmp_path):
    import modules.paper_trading as m
    monkeypatch.setattr(m, '_DB', tmp_path / 'fillmode.db')
    m.init_paper_tables()
    return m


def _make_account(pt_mod, fill_mode):
    plan = _bare_plan(fill_mode)
    plan.update({
        'ai_mode': 'manual', 'pos_size_pct': 50, 'sizing_mode': 'fixed',
        'vol_target_annual_pct': 0, 'max_per_name_pct': 100,
        'vix_gate_threshold': 0, 'mtf_gate': False, 'use_hmm_regime': False,
        'max_per_sector_pct': 0, 'vwap_chase_max_pct': 0,
        'vwap_undercut_max_pct': 0,
    })
    dates = _synthetic_series()[0]
    with sqlite3.connect(str(pt_mod._DB)) as c:
        cur = c.execute(
            "INSERT INTO paper_accounts "
            "(user_id, name, plan_json, initial_capital, cash, status, start_date, "
            " peak_equity, base_currency) "
            "VALUES (1, 'T', ?, 10000, 10000, 'active', ?, 10000, 'USD')",
            (json.dumps(plan), dates[0]))
        c.commit()
        return cur.lastrowid


def _stub_live_data(pt_mod, monkeypatch):
    dates, closes, highs, lows = _synthetic_series()
    sigs = _signal_array()
    exit_sigs = [0] * N_BARS
    monkeypatch.setattr(
        pt_mod, '_signals_for',
        lambda sym, plan, account_ccy='USD': (dates, closes, highs, lows, sigs, exit_sigs))
    # Earnings blackout does per-symbol calendar lookups — stub to "no event".
    import modules.pro_calendar as cal
    monkeypatch.setattr(cal, '_fetch_calendar', lambda sym: None)


def test_live_engine_next_close_matches_backtester(pt, monkeypatch):
    """Engine parity: the live tick and the backtester must produce the same
    entry/exit dates for the same series, signals, and fill_mode."""
    _stub_live_data(pt, monkeypatch)
    dates = _synthetic_series()[0]

    for fill_mode, want_entry, want_exit in (
            ('same_close', dates[SIG_ON], dates[SIG_OFF]),
            ('next_close', dates[SIG_ON + 1], dates[SIG_OFF + 1])):
        acct = _make_account(pt, fill_mode)
        res = pt._run_account_tick_impl(1, acct, until_date=dates[-1])
        assert res.get('success'), res
        with sqlite3.connect(str(pt._DB)) as c:
            c.row_factory = sqlite3.Row
            rows = c.execute(
                "SELECT * FROM paper_positions WHERE account_id=? ORDER BY id",
                (acct,)).fetchall()
        assert rows, f'{fill_mode}: expected a position'
        assert rows[0]['entry_date'] == want_entry, fill_mode
        assert rows[0]['status'] == 'closed', fill_mode
        assert rows[0]['exit_date'] == want_exit, fill_mode


def test_create_account_defaults_to_next_close(pt):
    res = pt.create_account(
        user_id=1, plan={'name': 'fresh', 'symbols': ['AAPL'], 'capital': 10000})
    assert res['success']
    assert res['plan']['fill_mode'] == 'next_close'
