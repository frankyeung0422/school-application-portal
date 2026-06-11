"""
E2 regression tests — statistical Jump Model regime engine (shadow mode).

Run:
    PYTHONPATH=web python -m pytest tests/test_jump_regime.py -v
"""
from __future__ import annotations

import math
import random
import sqlite3
import sys
from datetime import date
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))

pytest.importorskip('jumpmodels')

TODAY = date.today().isoformat()


def _two_regime_closes(n=900, seed=3):
    """Synthetic series: calm uptrend blocks alternating with volatile
    drawdown blocks — exactly what a 2-state regime model must separate."""
    rng = random.Random(seed)
    closes = [100.0]
    for i in range(n - 1):
        block = (i // 150) % 2
        if block == 0:   # bull: drift up, low vol
            r = 0.0008 + rng.gauss(0, 0.006)
        else:            # bear: drift down, high vol
            r = -0.0012 + rng.gauss(0, 0.02)
        closes.append(max(1.0, closes[-1] * (1 + r)))
    return closes


@pytest.fixture()
def jr(monkeypatch, tmp_path):
    import modules.paper_trading as pt
    import modules.jump_regime as m
    monkeypatch.setattr(pt, '_DB', tmp_path / 'jump.db')
    pt.init_paper_tables()
    monkeypatch.setattr(m, '_MODEL_PATH', tmp_path / 'jump_model.pkl')
    closes = _two_regime_closes()
    monkeypatch.setattr(m, '_fetch',
                        lambda sym, period: (['d'] * len(closes), closes,
                                             closes, closes))
    return m


def test_fit_separates_regimes(jr):
    res = jr.fit_weekly()
    assert res.get('success'), res
    # Both states must actually be used (a degenerate one-state fit is a fail).
    assert 0.15 < res['bear_frac'] < 0.85, res
    assert jr._MODEL_PATH.exists()


def test_update_daily_writes_shadow_row(jr, monkeypatch):
    assert jr.fit_weekly()['success']
    import modules.hmm_regime as hmm
    monkeypatch.setattr(hmm, 'current_regime',
                        lambda: {'regime': 'bull', 'posterior': {'bear': 0.1}})
    res = jr.update_daily()
    assert res.get('success'), res
    assert res['regime'] in ('bull', 'bear')
    assert res['hmm_state'] == 'bull'
    assert res['agree'] in (0, 1)
    cr = jr.current_regime()
    assert cr['regime'] == res['regime']
    assert cr['date'] == TODAY


def test_is_bear_threshold(jr, monkeypatch):
    jr.init_jump_tables()
    import modules.paper_trading as pt
    with sqlite3.connect(str(pt._DB)) as c:
        c.execute("INSERT OR REPLACE INTO jump_regime_state VALUES "
                  "(?, 'bear', 0.85, 'v', 'bull', 0.2, 0)", (TODAY,))
        c.commit()
    assert jr.is_bear(threshold=0.7) is True
    assert jr.is_bear(threshold=0.9) is False


def test_disagreement_rate(jr):
    jr.init_jump_tables()
    import modules.paper_trading as pt
    with sqlite3.connect(str(pt._DB)) as c:
        for i, agree in enumerate([1, 1, 0, 1, 0]):
            c.execute("INSERT OR REPLACE INTO jump_regime_state VALUES "
                      "(?, 'bull', 0.2, 'v', 'bull', 0.2, ?)",
                      (f'2026-06-{i + 1:02d}', agree))
        c.commit()
    assert jr.disagreement_rate(30) == pytest.approx(0.4)


def test_no_data_degrades(jr):
    assert jr.update_daily()['success'] is False   # no model fitted yet
    assert jr.current_regime()['regime'] == 'unknown'
    assert jr.is_bear() is False
    assert jr.disagreement_rate() is None


# ----------------------------------------------------------- tick gate select

def test_tick_gate_selects_engine_by_flag(monkeypatch, tmp_path):
    """Plan without use_jump_regime → HMM consulted; with it → JM consulted."""
    import modules.paper_trading as pt
    import modules.hmm_regime as hmm
    import modules.jump_regime as jm
    monkeypatch.setattr(pt, '_DB', tmp_path / 'gate.db')
    pt.init_paper_tables()

    calls = []
    monkeypatch.setattr(hmm, 'is_bear',
                        lambda threshold=0.7: calls.append('hmm') or False)
    monkeypatch.setattr(jm, 'is_bear',
                        lambda threshold=0.7: calls.append('jm') or False)
    monkeypatch.setattr(hmm, 'current_regime', lambda: {'posterior': {'bear': 0}})
    monkeypatch.setattr(jm, 'current_regime', lambda: {'posterior': {'bear': 0}})

    import json
    base_plan = {
        'symbols': ['AAPL'], 'strategies': ['ma_cross'], 'combine_mode': 'any',
        'ai_mode': 'manual', 'vix_gate_threshold': 0, 'mtf_gate': False,
        'use_hmm_regime': True, 'max_per_sector_pct': 0,
    }
    monkeypatch.setattr(pt, '_signals_for', lambda *a, **k: None)  # no data → early exit
    import modules.pro_calendar as cal
    monkeypatch.setattr(cal, '_fetch_calendar', lambda sym: None)

    for flag, expect in ((False, 'hmm'), (True, 'jm')):
        calls.clear()
        plan = dict(base_plan, use_jump_regime=flag)
        with sqlite3.connect(str(pt._DB)) as c:
            cur = c.execute(
                "INSERT INTO paper_accounts (user_id, name, plan_json, "
                "initial_capital, cash, status, start_date, peak_equity, "
                "base_currency) VALUES (1, 'G', ?, 10000, 10000, 'active', ?, "
                "10000, 'USD')", (json.dumps(plan), TODAY))
            acct = cur.lastrowid
            c.commit()
        pt._run_account_tick_impl(1, acct, until_date=TODAY)
        assert expect in calls, (flag, calls)
        assert ('jm' if expect == 'hmm' else 'hmm') not in calls
