"""
E3 regression tests — A-share honest enablement (fees, lots, T+1, data).

Run:
    PYTHONPATH=web python -m pytest tests/test_cn_enablement.py -v
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


# ------------------------------------------------------------- fees + lots

def test_cn_fee_table_sell_carries_stamp_duty():
    import modules.paper_trading as pt
    buy = pt._fee_bps('600519.SS', 'buy')
    sell = pt._fee_bps('600519.SS', 'sell')
    assert buy == pytest.approx(2.5 / 10000)
    assert sell == pytest.approx(7.5 / 10000)        # 2.5bp comm + 5bp stamp
    assert sell - buy == pytest.approx(5.0 / 10000)  # the 0.05% duty itself


def test_cn_venue_and_lot():
    import modules.paper_trading as pt
    assert pt._venue_for('600519.SS') == 'CN'
    assert pt._venue_for('000001.SZ') == 'CN'
    assert pt._lot_size('600519.SS') == 100
    assert pt._lot_size('000001.SZ') == 100
    assert pt._lot_size('AAPL') == 1   # untouched


# ---------------------------------------------------------------- T+1: sim

N_BARS = 90
SIG_ON = 70


def _series():
    dates = [f'2026-0{1 + i // 28}-{(i % 28) + 1:02d}' for i in range(N_BARS)]
    closes = [100.0] * N_BARS
    # Same-day round trip bait: signal fires AND crashes through a stop
    # intraday on the same bar.
    closes[SIG_ON] = 100.0
    lows = [c * 0.999 for c in closes]
    lows[SIG_ON] = 80.0          # would hit any stop on the entry bar
    highs = [c * 1.001 for c in closes]
    return dates, closes, highs, lows


@pytest.fixture()
def sim(monkeypatch):
    import modules.autotrade_sim as ats
    import modules.paper_trading as pt
    data = _series()
    sigs = [0] * N_BARS
    for i in range(SIG_ON, SIG_ON + 5):
        sigs[i] = 1
    monkeypatch.setattr(ats, '_fetch', lambda sym, period: data)
    monkeypatch.setattr(ats, '_combine_signals', lambda *a: list(sigs))
    monkeypatch.setattr(pt, '_build_exit_signals', lambda *a: [0] * N_BARS)
    return ats


def _plan(t1, symbol_unused=None):
    return {'symbols': ['600519.SS'], 'strategies': ['ma_cross'],
            'combine_mode': 'any', 'period': '1y', 'capital': 100000,
            'take_profit_pct': 0, 'stop_loss_pct': 10, 'atr_stop_mult': 0,
            'trailing_stop_pct': 0, 'profit_ladder_pct': [],
            'ladder_trim_fractions': [], 'min_trade_value': 50,
            'hold_cooldown_days': 0, 'fill_mode': 'same_close',
            'cn_t_plus_one': t1}


def test_sim_t1_blocks_same_day_stop(sim):
    res = sim._simulate_symbol('600519.SS', _plan(True), 100000.0)
    assert res['success']
    trades = res['trades']
    assert trades, 'expected a trade'
    # Entry on SIG_ON's bar; the intraday crash through the stop on the SAME
    # bar must NOT fill — earliest exit is the next bar.
    dates = _series()[0]
    assert trades[0]['entry_date'] == dates[SIG_ON]
    assert trades[0]['exit_date'] > dates[SIG_ON]


def test_sim_flag_off_matches_flag_on(sim):
    """Both engines already process exits BEFORE entries each bar, so a
    same-day entry→exit was structurally impossible pre-E3; the T+1 check is
    a defense-in-depth invariant. Behavior with/without the flag must
    therefore be identical on this series."""
    with_flag = sim._simulate_symbol('600519.SS', _plan(True), 100000.0)
    without = sim._simulate_symbol('600519.SS', _plan(False), 100000.0)
    assert with_flag['trades'] == without['trades']


def test_sim_t1_flag_ignores_us_symbols(sim):
    plan = _plan(True)
    plan['symbols'] = ['AAPL']
    us = sim._simulate_symbol('AAPL', plan, 100000.0)
    cn = sim._simulate_symbol('600519.SS', _plan(True), 100000.0)
    # Same synthetic series → same trade timeline; the CN flag must not
    # alter the US path (fees differ, dates must not).
    assert [t['exit_date'] for t in us['trades']] == \
           [t['exit_date'] for t in cn['trades']]


# --------------------------------------------------------------- T+1: live

def test_live_t1_blocks_same_day_exit(monkeypatch, tmp_path):
    import modules.paper_trading as pt
    monkeypatch.setattr(pt, '_DB', tmp_path / 'cn.db')
    pt.init_paper_tables()

    dates, closes, highs, lows = _series()
    sigs = [0] * N_BARS
    for i in range(SIG_ON, SIG_ON + 5):
        sigs[i] = 1
    monkeypatch.setattr(pt, '_signals_for',
                        lambda sym, plan, account_ccy='USD':
                        (dates, closes, highs, lows, list(sigs), [0] * N_BARS))
    import modules.pro_calendar as cal
    monkeypatch.setattr(cal, '_fetch_calendar', lambda sym: None)
    monkeypatch.setattr(pt, '_fx_rate', lambda *a, **k: 1.0, raising=False)

    plan = dict(_plan(True), ai_mode='manual', pos_size_pct=30,
                sizing_mode='fixed', vol_target_annual_pct=0,
                max_per_name_pct=100, vix_gate_threshold=0, mtf_gate=False,
                use_hmm_regime=False, max_per_sector_pct=0,
                vwap_chase_max_pct=0, vwap_undercut_max_pct=0)
    with sqlite3.connect(str(pt._DB)) as c:
        cur = c.execute(
            "INSERT INTO paper_accounts (user_id, name, plan_json, "
            "initial_capital, cash, status, start_date, peak_equity, "
            "base_currency) VALUES (1, 'CN', ?, 100000, 100000, 'active', ?, "
            "100000, 'USD')", (json.dumps(plan), dates[0]))
        acct = cur.lastrowid
        c.commit()
    res = pt._run_account_tick_impl(1, acct, until_date=dates[-1])
    assert res.get('success'), res
    with sqlite3.connect(str(pt._DB)) as c:
        c.row_factory = sqlite3.Row
        rows = c.execute("SELECT * FROM paper_positions WHERE account_id=?",
                         (acct,)).fetchall()
    assert rows
    r = rows[0]
    assert r['entry_date'] == dates[SIG_ON]
    # The stop that the entry bar's low would have hit must fill no earlier
    # than the next bar.
    assert r['status'] == 'closed'
    assert r['exit_date'] > dates[SIG_ON]


# -------------------------------------------------------------- cn_data map

def test_symbol_mapping():
    import modules.cn_data as cd
    assert cd._to_tushare('600519.SS') == '600519.SH'
    assert cd._to_tushare('000001.SZ') == '000001.SZ'
    assert cd._to_akshare('600519.SS') == '600519'
    assert cd.is_cn_symbol('600519.SS') and cd.is_cn_symbol('000001.SZ')
    assert not cd.is_cn_symbol('AAPL') and not cd.is_cn_symbol('0700.HK')


def test_cn_data_fallback_order(monkeypatch):
    import modules.cn_data as cd
    cd._CACHE.clear()
    calls = []
    rows = [('2026-01-02', 10.0, 10.5, 10.6, 9.9, 1000.0)]
    monkeypatch.setattr(cd, '_rows_tushare',
                        lambda s, p: calls.append('ts') or None)  # fails
    monkeypatch.setattr(cd, '_rows_akshare',
                        lambda s, p: calls.append('ak') or rows)
    out = cd.fetch_daily('600519.SS', '1y')
    assert calls == ['ts', 'ak']        # tushare first, akshare fallback
    assert out[1] == [10.5]             # closes from akshare


def test_cn_data_tuple_shapes(monkeypatch):
    import modules.cn_data as cd
    cd._CACHE.clear()
    rows = [('2026-01-02', 10.0, 10.5, 10.6, 9.9, 1000.0),
            ('2026-01-03', 10.5, 10.7, 10.8, 10.4, 1200.0)]
    monkeypatch.setattr(cd, '_rows_tushare', lambda s, p: rows)
    d4 = cd.fetch_daily('600519.SS')
    assert len(d4) == 4 and d4[0] == ['2026-01-02', '2026-01-03']
    cd._CACHE.clear()
    monkeypatch.setattr(cd, '_rows_tushare', lambda s, p: rows)
    d6 = cd.fetch_daily_full('600519.SS')
    assert len(d6) == 6 and d6[5] == [1000.0, 1200.0]


# --------------------------------------------------------- fetch delegation

def test_fetch_delegates_only_broken_cn(monkeypatch):
    import modules.pro_backtest as pb
    import modules.cn_data as cd
    good = (['d'] * 200, [10.0] * 200, [10.1] * 200, [9.9] * 200)
    short = (['d'] * 5, [10.0] * 5, [10.1] * 5, [9.9] * 5)
    cn_rows = (['c'] * 100, [1.0] * 100, [1.1] * 100, [0.9] * 100)
    monkeypatch.setattr(cd, 'fetch_daily', lambda s, p: cn_rows)

    # CN symbol, yfinance broken → delegate.
    monkeypatch.setattr(pb, '_fetch_yf', lambda s, p: short)
    assert pb._fetch('600519.SS', '1y') == cn_rows
    # CN symbol, yfinance healthy → keep yfinance.
    monkeypatch.setattr(pb, '_fetch_yf', lambda s, p: good)
    assert pb._fetch('600519.SS', '1y') == good
    # US symbol, even broken → NEVER delegate.
    monkeypatch.setattr(pb, '_fetch_yf', lambda s, p: short)
    assert pb._fetch('AAPL', '1y') == short


def test_universe_registered():
    import modules.ai_picks as ap
    u = ap.UNIVERSES.get('csi300_top50')
    assert u and len(u['symbols']) == 50
    assert all(s.endswith(('.SS', '.SZ')) for s in u['symbols'])
