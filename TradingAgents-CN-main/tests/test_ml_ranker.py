"""
P1c regression tests — LightGBM learning-to-rank stock selector.

Synthetic universe: 12 symbols with distinct deterministic drifts. A working
ranker must recover the drift ordering out-of-sample (positive rank IC) and
the wiring must degrade gracefully (stale scores → heuristic fallback).

Run:
    PYTHONPATH=web python -m pytest tests/test_ml_ranker.py -v
"""
from __future__ import annotations

import random
import sqlite3
import sys
from datetime import date, timedelta
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

N_BARS = 320
SYMBOLS = [f'SYM{i:02d}' for i in range(12)]


def _drift(sym: str) -> float:
    i = int(sym[3:])
    return -0.003 + 0.0006 * i  # SYM00 worst … SYM11 best


def _series(sym: str):
    rng = random.Random(hash(sym) % 10_000)
    d0 = date(2025, 1, 1)
    closes = [100.0]
    for _ in range(N_BARS - 1):
        closes.append(max(1.0, closes[-1] * (1 + _drift(sym) + rng.gauss(0, 0.004))))
    dates = [(d0 + timedelta(days=i)).isoformat() for i in range(N_BARS)]
    opens = list(closes)
    highs = [c * 1.01 for c in closes]
    lows = [c * 0.99 for c in closes]
    volumes = [1_000_000 + rng.random() * 100_000 for _ in closes]
    return dates, opens, closes, highs, lows, volumes


@pytest.fixture()
def mr(monkeypatch, tmp_path):
    import modules.paper_trading as pt
    import modules.ml_ranker as m
    import modules.ai_picks as ap
    monkeypatch.setattr(pt, '_DB', tmp_path / 'ranker.db')
    pt.init_paper_tables()
    monkeypatch.setattr(m, '_MODEL_PATH', tmp_path / 'ml_ranker.pkl')
    monkeypatch.setattr(m, '_fetch_full', lambda sym, period: _series(sym))
    monkeypatch.setitem(ap.UNIVERSES, 'testu',
                        {'label': 'Test', 'symbols': list(SYMBOLS)})
    return m


_FAST_LGBM = {'n_estimators': 60, 'min_child_samples': 5, 'random_state': 42}


def test_train_recovers_drift_ordering(mr):
    res = mr.train_weekly(universe_ids=['testu'], lgbm_params=_FAST_LGBM)
    assert res.get('success'), res
    # Drift >> noise in this universe — a working ranker must find it OOS.
    assert res['rank_ic'] > 0.10, res
    assert mr._MODEL_PATH.exists()
    metrics = mr.latest_metrics()
    # train_weekly returns the IC rounded to 4dp; the DB stores it unrounded.
    assert metrics and metrics[0]['rank_ic'] == pytest.approx(res['rank_ic'], abs=1e-4)


def test_score_universe_and_top_symbols(mr):
    assert mr.train_weekly(universe_ids=['testu'], lgbm_params=_FAST_LGBM)['success']
    sres = mr.score_universe(universe_ids=['testu'])
    assert sres.get('success'), sres
    assert sres['n_scored'] == len(SYMBOLS)

    top = mr.top_symbols('testu', top_n=3)
    assert len(top) == 3
    assert set(top) <= set(SYMBOLS)
    # The top picks should be drawn from the high-drift half of the universe.
    assert all(_drift(s) > 0 for s in top), top


def test_top_symbols_stale_scores_return_empty(mr):
    assert mr.train_weekly(universe_ids=['testu'], lgbm_params=_FAST_LGBM)['success']
    assert mr.score_universe(universe_ids=['testu'])['success']
    # Age the scores past the staleness window.
    import modules.paper_trading as pt
    old = (date.today() - timedelta(days=30)).isoformat()
    with sqlite3.connect(str(pt._DB)) as c:
        c.execute('UPDATE ml_rank_scores SET score_date=?', (old,))
        c.commit()
    assert mr.top_symbols('testu', top_n=3) == []


def test_top_symbols_no_model_no_scores(mr):
    assert mr.top_symbols('testu', top_n=3) == []


# ------------------------------------------------------------- ai_picks wiring

def test_pick_source_ml_ranker_uses_ranker(mr, monkeypatch):
    import modules.ai_picks as ap
    monkeypatch.setattr(mr, 'top_symbols',
                        lambda universe, top_n, custom_symbols=None: ['SYM11', 'SYM10'])
    out = ap.top_long_symbols('testu', top_n=2, pick_source='ml_ranker')
    assert out == ['SYM11', 'SYM10']


def test_pick_source_falls_back_when_ranker_empty(mr, monkeypatch):
    import modules.ai_picks as ap
    monkeypatch.setattr(mr, 'top_symbols',
                        lambda universe, top_n, custom_symbols=None: [])
    monkeypatch.setattr(ap, 'scan_universe',
                        lambda universe, top_n, custom_symbols=None: {
                            'success': True,
                            'top': [{'symbol': 'HEUR1', 'direction': 'BUY'},
                                    {'symbol': 'HEUR2', 'direction': 'HOLD'}]})
    out = ap.top_long_symbols('testu', top_n=2, pick_source='ml_ranker')
    assert out == ['HEUR1', 'HEUR2']


def test_pick_source_default_skips_ranker(mr, monkeypatch):
    import modules.ai_picks as ap

    def _boom(*a, **k):
        raise AssertionError('ranker must not be called for heuristic source')

    monkeypatch.setattr(mr, 'top_symbols', _boom)
    monkeypatch.setattr(ap, 'scan_universe',
                        lambda universe, top_n, custom_symbols=None: {
                            'success': True,
                            'top': [{'symbol': 'HEUR1', 'direction': 'BUY'}]})
    out = ap.top_long_symbols('testu', top_n=1)
    assert out == ['HEUR1']
