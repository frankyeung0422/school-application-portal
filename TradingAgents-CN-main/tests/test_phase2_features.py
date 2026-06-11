"""
P2 regression tests — LLM-as-features (point-in-time + outcome embargo),
factor-momentum overlay, and the ranker confidence gate.

Run:
    PYTHONPATH=web python -m pytest tests/test_phase2_features.py -v
"""
from __future__ import annotations

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


@pytest.fixture()
def db(monkeypatch, tmp_path):
    import modules.paper_trading as pt
    monkeypatch.setattr(pt, '_DB', tmp_path / 'p2.db')
    pt.init_paper_tables()
    return pt


# ---------------------------------------------------------------- llm_features

def _mk_news_table(db_path):
    with sqlite3.connect(str(db_path)) as c:
        c.execute('''CREATE TABLE IF NOT EXISTS news_articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT, symbol TEXT, source TEXT,
            url TEXT UNIQUE, headline TEXT, published_at TEXT,
            body_excerpt TEXT)''')
        c.commit()


def test_llm_features_point_in_time(db, monkeypatch):
    import modules.llm_features as lf
    _mk_news_table(db._DB)
    fdate = '2026-06-01'
    with sqlite3.connect(str(db._DB)) as c:
        # 2 articles before the feature date, 1 AFTER (must be invisible)
        c.execute("INSERT INTO news_articles (symbol, source, url, headline, published_at) "
                  "VALUES ('TST', 't', 'u1', 'TST beats earnings guidance', '2026-05-30')")
        c.execute("INSERT INTO news_articles (symbol, source, url, headline, published_at) "
                  "VALUES ('TST', 't', 'u2', 'Regulator opens probe into TST', '2026-05-31')")
        c.execute("INSERT INTO news_articles (symbol, source, url, headline, published_at) "
                  "VALUES ('TST', 't', 'u3', 'TST announces merger', '2026-06-03')")
        c.commit()
    # news_momentum touches the live sentiment tables — neutralize.
    import modules.news_aggregator as na
    monkeypatch.setattr(na, 'news_momentum', lambda sym, days=7: 0.5)

    res = lf.build_daily_features(symbols=['TST'], feature_date=fdate)
    assert res['written'] == 1
    feats = lf.panel_features('TST', fdate)
    assert feats['llm_article_count'] == 2          # u3 is in the future
    assert feats['llm_event_earnings'] == 1
    assert feats['llm_event_regulatory'] == 1
    assert feats['llm_event_ma'] == 0               # merger headline not visible
    assert feats['llm_tone'] == pytest.approx(0.5)


def test_panel_features_respects_asof(db, monkeypatch):
    import modules.llm_features as lf
    _mk_news_table(db._DB)
    import modules.news_aggregator as na
    monkeypatch.setattr(na, 'news_momentum', lambda sym, days=7: 0.2)
    with sqlite3.connect(str(db._DB)) as c:
        c.execute("INSERT INTO news_articles (symbol, source, url, headline, published_at) "
                  "VALUES ('TST', 't', 'u1', 'TST revenue up', '2026-05-30')")
        c.commit()
    lf.build_daily_features(symbols=['TST'], feature_date='2026-06-01')
    # As-of BEFORE the feature row exists → zeros (no time travel).
    before = lf.panel_features('TST', '2026-05-20')
    assert all(v == 0.0 for v in before.values())
    # As-of long after → stale (> max_age_days) → zeros again.
    stale = lf.panel_features('TST', '2026-07-15')
    assert all(v == 0.0 for v in stale.values())


def test_outcome_embargo(db):
    import modules.llm_features as lf
    asof = '2026-06-10'
    with sqlite3.connect(str(db._DB)) as c:
        for exit_d, pnl in (('2026-05-01', 10.0),   # old — visible
                            ('2026-06-01', -5.0),   # 9 days before — visible
                            ('2026-06-08', 50.0)):  # 2 days before — EMBARGOED
            c.execute(
                "INSERT INTO paper_positions (account_id, symbol, shares, "
                "entry_price, entry_date, status, exit_date, pnl_pct) "
                "VALUES (1, 'TST', 10, 100, '2026-04-01', 'closed', ?, ?)",
                (exit_d, pnl))
        c.commit()
    mem = lf.embargoed_trade_outcomes('TST', asof, embargo_days=7)
    assert mem['mem_n_trades'] == 2          # the +50% trade is too fresh
    assert mem['mem_avg_pnl_pct'] == pytest.approx(2.5)
    assert mem['mem_win_rate'] == pytest.approx(0.5)


# ------------------------------------------------------------- factor momentum

def _synthetic_calibration_rows(n=80):
    """flow predicts outcome (+), news anti-predicts (−), risk predicts bad."""
    rows = []
    base = date.today() - timedelta(days=120)
    for i in range(n):
        outcome = (i % 11) - 5.0  # -5..+5 cycling
        rows.append({
            'symbol': f'S{i % 7}',
            'score_date': (base + timedelta(days=i)).isoformat(),
            'flow': outcome / 10.0 + 0.5,        # positively aligned
            'news': -outcome / 10.0 + 0.5,       # negatively aligned
            'technical': 0.5,                     # uninformative
            'insider': 0.5,
            'risk': -outcome / 10.0 + 0.5,       # high risk ↔ bad outcome
            'outcome': outcome,
        })
    return rows


def test_factor_momentum_tilts_and_bounds(db, monkeypatch):
    import modules.factor_momentum as fm
    import modules.conviction_calibration as cc
    monkeypatch.setattr(cc, '_training_rows', lambda: _synthetic_calibration_rows())
    res = fm.compute_weights()
    assert res['success'] and not res['neutral']
    m = res['multipliers']
    assert m['flow'] > 1.0
    assert m['news'] < 1.0
    assert m['risk'] > 1.0           # penalty upweighted when it predicts pain
    assert all(0.70 <= v <= 1.30 for v in m.values())
    # Persisted and served back.
    cur = fm.current_multipliers()
    assert cur == {k: pytest.approx(v) for k, v in m.items()}


def test_factor_momentum_thin_data_neutral(db, monkeypatch):
    import modules.factor_momentum as fm
    import modules.conviction_calibration as cc
    monkeypatch.setattr(cc, '_training_rows',
                        lambda: _synthetic_calibration_rows(10))
    res = fm.compute_weights()
    assert res['neutral']
    assert all(v == 1.0 for v in res['multipliers'].values())


def test_factor_momentum_stale_returns_neutral(db, monkeypatch):
    import modules.factor_momentum as fm
    fm.init_factor_momentum_table()
    old = (date.today() - timedelta(days=60)).isoformat()
    with sqlite3.connect(str(db._DB)) as c:
        c.execute("INSERT INTO factor_momentum_weights VALUES (?, 'flow', 0.2, 99, 1.3)",
                  (old,))
        c.commit()
    assert fm.current_multipliers() == {f: 1.0 for f in fm._FACTORS}


# ------------------------------------------------------------- confidence gate

def _insert_metrics(db_path, ics):
    with sqlite3.connect(str(db_path)) as c:
        for ic in ics:
            c.execute(
                "INSERT INTO ml_ranker_metrics (train_date, rank_ic, n_samples, "
                "n_holdout_dates, model_version) VALUES ('2026-06-01', ?, 100, 8, 'v')",
                (ic,))
        c.commit()


def test_confidence_gate_healthy(db):
    import modules.ml_ranker as mr
    mr.init_ml_tables()
    _insert_metrics(db._DB, [0.06, 0.05, 0.08, 0.04])
    cs = mr.confidence_state()
    assert cs['gate'] == 1.0


def test_confidence_gate_negative_ic(db):
    import modules.ml_ranker as mr
    mr.init_ml_tables()
    _insert_metrics(db._DB, [-0.02, -0.05, 0.01, -0.03])
    cs = mr.confidence_state()
    assert cs['gate'] == pytest.approx(0.3)


def test_confidence_gate_weak_ic(db):
    import modules.ml_ranker as mr
    mr.init_ml_tables()
    _insert_metrics(db._DB, [0.02, 0.01, 0.02, 0.025])
    cs = mr.confidence_state()
    assert cs['gate'] == pytest.approx(0.6)


def test_confidence_gate_ignores_ablation_rows(db):
    import modules.ml_ranker as mr
    mr.init_ml_tables()
    _insert_metrics(db._DB, [0.06, 0.05])
    with sqlite3.connect(str(db._DB)) as c:
        c.execute(
            "INSERT INTO ml_ranker_metrics (train_date, rank_ic, n_samples, "
            "n_holdout_dates, model_version, note) "
            "VALUES ('2026-06-01', -0.9, 100, 8, 'v', 'ablation_no_llm')")
        c.commit()
    cs = mr.confidence_state()
    assert cs['gate'] == 1.0  # the ablation row must not poison the gate
