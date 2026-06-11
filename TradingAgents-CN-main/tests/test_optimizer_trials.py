"""
P1b regression tests — optimizer trial logging + multiple-testing deflation.

Covered:
  - _deflate_penalty: the max of N pure-noise scores deflates to <= 0.
  - optimize_plan: trial_sink receives one record per evaluated config,
    walk-forward OOS scores are backfilled, and every returned candidate
    carries score_deflated = score - penalty.
  - evolve_account_plan: the sink persists rows into optimizer_trials with
    a shared run_id and the account id.

Run:
    PYTHONPATH=web python -m pytest tests/test_optimizer_trials.py -v
"""
from __future__ import annotations

import json
import random
import sqlite3
import sys
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))


# ---------------------------------------------------------------- deflation

def test_noise_search_deflates_to_zero_or_below():
    """Picking the best of 200 noise trials looks great raw and must not
    survive deflation: penalty ~ sigma*sqrt(2 ln N) >= expected max."""
    import modules.autotrade_sim as ats
    rng = random.Random(7)
    scores = [rng.gauss(0.0, 10.0) for _ in range(200)]
    raw_best = max(scores)
    assert raw_best > 0  # the illusion: noise produced a "winner"
    penalty = ats._deflate_penalty(scores, len(scores))
    assert penalty > 0
    assert raw_best - penalty <= 0  # the correction kills it


def test_deflate_penalty_degenerate_inputs():
    import modules.autotrade_sim as ats
    assert ats._deflate_penalty([], 0) == 0.0
    assert ats._deflate_penalty([5.0], 1) == 0.0
    assert ats._deflate_penalty([None, -1e9, 3.0], 50) == 0.0  # one valid score


# ---------------------------------------------------------------- optimize_plan

def _fake_simulate_plan(plan, slice_range=None):
    """Deterministic synthetic backtest: score derives from config hash so
    different configs rank differently, same config reproduces exactly."""
    key = json.dumps({
        'strategies': plan.get('strategies'),
        'combine_mode': plan.get('combine_mode'),
        'tp': plan.get('take_profit_pct'), 'sl': plan.get('stop_loss_pct'),
        'pos': plan.get('pos_size_pct'), 'slice': slice_range,
    }, sort_keys=True)
    h = abs(hash(key)) % 1000
    return {
        'success': True,
        'metrics': {
            'total_return_pct': (h - 500) / 25.0,  # -20%..+20%
            'max_drawdown_pct': h % 30,
            'sharpe': (h % 40) / 20.0 - 1.0,
            'trade_count': 3 + h % 10,
            'benchmark_total_pct': 5.0,
        },
    }


def test_optimize_plan_sink_and_deflated_scores(monkeypatch):
    import modules.autotrade_sim as ats
    monkeypatch.setattr(ats, 'simulate_plan', _fake_simulate_plan)

    records = []
    res = ats.optimize_plan(
        {'symbols': ['TEST'], 'strategies': ['ma_cross', 'momentum'],
         'period': '1y', 'capital': 10000},
        max_iterations=30, walk_forward=True, train_pct=0.7,
        rng_seed=1, trial_sink=records.append)

    assert res['success']
    # One sink record per evaluated config (random phase + refinement).
    assert len(records) == res['deflation']['n_evals']
    assert len(records) >= 30
    for rec in records:
        assert 'config' in rec and rec['train_score'] is not None
        # P4 purge: train ends an embargo gap before the OOS region starts.
        assert rec['slice']['test'] == (0.7, 1.0)
        assert rec['slice']['train'][0] == 0.0
        assert rec['slice']['train'][1] < 0.7
    # Walk-forward re-ran the top candidates → their records carry OOS scores.
    assert sum(1 for r in records if r['oos_score'] is not None) > 0

    penalty = res['deflation']['penalty']
    assert penalty > 0
    best = res['best']
    assert best['score_deflated'] == pytest.approx(best['score'] - penalty, abs=0.01)
    assert '_trial_rec' not in best  # internal bookkeeping stripped


def test_optimize_plan_without_sink_unchanged(monkeypatch):
    """No sink → same search result, no crash (back-compat)."""
    import modules.autotrade_sim as ats
    monkeypatch.setattr(ats, 'simulate_plan', _fake_simulate_plan)
    res = ats.optimize_plan(
        {'symbols': ['TEST'], 'strategies': ['ma_cross'], 'period': '1y',
         'capital': 10000},
        max_iterations=10, walk_forward=False, rng_seed=1)
    assert res['success']
    assert 'score_deflated' in res['best']


# ---------------------------------------------------------------- evolve wiring

def test_evolve_account_plan_persists_trials(monkeypatch, tmp_path):
    import modules.paper_trading as pt
    import modules.autotrade_sim as ats
    monkeypatch.setattr(pt, '_DB', tmp_path / 'trials.db')
    pt.init_paper_tables()

    plan = {'symbols': ['TEST'], 'strategies': ['ma_cross'],
            'combine_mode': 'any', 'take_profit_pct': 10, 'stop_loss_pct': 5,
            'pos_size_pct': 20}
    with sqlite3.connect(str(pt._DB)) as c:
        cur = c.execute(
            "INSERT INTO paper_accounts "
            "(user_id, name, plan_json, initial_capital, cash, status, start_date, "
            " peak_equity, base_currency) "
            "VALUES (1, 'T', ?, 10000, 10000, 'active', '2026-01-01', 10000, 'USD')",
            (json.dumps(plan),))
        acct = cur.lastrowid
        c.commit()

    # Stub the search: call the sink 3 times, return a minimal winner.
    def fake_optimize(base_plan, **kw):
        sink = kw.get('trial_sink')
        for i in range(3):
            sink({'config': {'take_profit_pct': 10 + i}, 'train_score': float(i),
                  'oos_score': float(i) / 2, 'annual_pct': 1.0 * i,
                  'n_trades': 5, 'slice': {'train': (0.0, 0.7), 'test': (0.7, 1.0)}})
        return {
            'success': True, 'trials_count': 3,
            'best': {'plan': dict(plan), 'score': 50.0, 'score_deflated': 12.0,
                     'annual_return_pct': 30.0, 'metrics': {}},
            'top': [], 'deflation': {'n_evals': 3, 'penalty': 38.0, 'lambda': 1.0},
        }

    monkeypatch.setattr(ats, 'optimize_plan', fake_optimize)
    monkeypatch.setattr(ats, 'simulate_plan', _fake_simulate_plan)
    # Keep the test offline: regime/live-fitness probes would hit yfinance.
    monkeypatch.setattr(pt, '_classify_current_regime',
                        lambda: {'regime': 'unknown'}, raising=False)
    monkeypatch.setattr(pt, '_live_fitness',
                        lambda *a, **k: {'applicable': False}, raising=False)
    # The mutation/GA/LLM challenger sources are irrelevant here and the LLM
    # one makes real API calls — stub them out.
    import modules.paper_learning as pl
    for src in ('source_random_mutation', 'source_ga_mutation',
                'source_llm_proposal'):
        monkeypatch.setattr(pl, src, lambda *a, **k: None, raising=False)

    res = pt.evolve_account_plan(1, acct, apply_if_better=False)
    assert res.get('success'), res

    with sqlite3.connect(str(pt._DB)) as c:
        c.row_factory = sqlite3.Row
        rows = c.execute(
            'SELECT * FROM optimizer_trials WHERE account_id=? ORDER BY id',
            (acct,)).fetchall()
    assert len(rows) == 3
    run_ids = {r['run_id'] for r in rows}
    assert len(run_ids) == 1 and all(run_ids)
    tps = [json.loads(r['config_json'])['take_profit_pct'] for r in rows]
    assert tps == [10, 11, 12]
    assert rows[2]['oos_score'] == pytest.approx(1.0)
