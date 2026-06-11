"""
E4 regression tests — pick-churn observability.

Run:
    PYTHONPATH=web python -m pytest tests/test_pick_churn.py -v
"""
from __future__ import annotations

import sqlite3
import sys
from datetime import date, timedelta
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))

TODAY = date.today().isoformat()
YDAY = (date.today() - timedelta(days=1)).isoformat()


@pytest.fixture()
def mr(monkeypatch, tmp_path):
    import modules.paper_trading as pt
    import modules.ml_ranker as m
    monkeypatch.setattr(pt, '_DB', tmp_path / 'churn.db')
    pt.init_paper_tables()
    m.init_ml_tables()
    return m


def _score_day(db, day, symbols):
    with sqlite3.connect(str(db)) as c:
        for pos, sym in enumerate(symbols, start=1):
            c.execute('INSERT OR REPLACE INTO ml_rank_scores VALUES '
                      '(?, ?, ?, ?, ?)', (day, sym, 100.0 - pos, pos, 'v'))
        c.commit()


def test_churn_computed_from_consecutive_days(mr):
    import modules.paper_trading as pt
    _score_day(pt._DB, YDAY, ['A', 'B', 'C', 'D'])
    _score_day(pt._DB, TODAY, ['A', 'B', 'E', 'F'])   # 2 of 6 union shared
    res = mr.record_pick_churn(top_n=4)
    assert res['success']
    assert res['churn'] == pytest.approx(1 - 2 / 6, abs=1e-4)
    assert mr.latest_pick_churn() == pytest.approx(1 - 2 / 6, abs=1e-4)


def test_identical_days_zero_churn(mr):
    import modules.paper_trading as pt
    _score_day(pt._DB, YDAY, ['A', 'B', 'C'])
    _score_day(pt._DB, TODAY, ['A', 'B', 'C'])
    assert mr.record_pick_churn(top_n=3)['churn'] == 0.0


def test_needs_two_days(mr):
    import modules.paper_trading as pt
    _score_day(pt._DB, TODAY, ['A', 'B'])
    assert mr.record_pick_churn()['success'] is False


def test_churn_rows_do_not_poison_confidence_gate(mr):
    """pick_churn stores its distance in the rank_ic column — the trailing-IC
    gate must skip those rows or a 90% churn day would read as IC=0.9."""
    import modules.paper_trading as pt
    with sqlite3.connect(str(pt._DB)) as c:
        for ic in (0.05, 0.06):
            c.execute("INSERT INTO ml_ranker_metrics (train_date, rank_ic, "
                      "n_samples, n_holdout_dates, model_version) "
                      "VALUES (?, ?, 100, 8, 'v')", (TODAY, ic))
        c.execute("INSERT INTO ml_ranker_metrics (train_date, rank_ic, "
                  "n_samples, model_version, note) "
                  "VALUES (?, 0.9, 10, NULL, 'pick_churn')", (TODAY,))
        c.commit()
    cs = mr.confidence_state()
    assert cs['trailing_ic'] == pytest.approx(0.055)   # churn row excluded
    assert cs['gate'] == 1.0
