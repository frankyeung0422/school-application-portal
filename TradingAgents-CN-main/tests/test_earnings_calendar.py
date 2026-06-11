"""
E1 regression tests — dual-source earnings calendar + agreement gating.

Run:
    PYTHONPATH=web python -m pytest tests/test_earnings_calendar.py -v
"""
from __future__ import annotations

import json
import math
import sqlite3
import sys
from datetime import date, timedelta
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))

TODAY = date.today()
EVENT = (TODAY + timedelta(days=3)).isoformat()
EVENT_OFF1 = (TODAY + timedelta(days=4)).isoformat()


@pytest.fixture()
def ec(monkeypatch, tmp_path):
    import modules.paper_trading as pt
    import modules.earnings_calendar as m
    monkeypatch.setattr(pt, '_DB', tmp_path / 'earn.db')
    pt.init_paper_tables()
    m.init_earnings_tables()
    return m


# ---------------------------------------------------------------- consensus

def test_consensus_two_of_three_agree(ec):
    d, s, n = ec._consensus({
        'finnhub': {'date': EVENT, 'session': 'amc'},
        'nasdaq': {'date': EVENT, 'session': 'amc'},
        'yfinance': {'date': EVENT_OFF1, 'session': None},  # off-by-one
    })
    assert d == EVENT and s == 'amc' and n == 2


def test_consensus_session_from_agreeing_source_only(ec):
    """The dissenting source's session must not leak onto the modal date."""
    d, s, n = ec._consensus({
        'finnhub': {'date': EVENT_OFF1, 'session': 'bmo'},   # dissents
        'nasdaq': {'date': EVENT, 'session': None},
        'yfinance': {'date': EVENT, 'session': None},
    })
    assert d == EVENT and n == 2
    assert s is None   # nobody on the modal date knows the session


def test_consensus_no_votes(ec):
    d, s, n = ec._consensus({'finnhub': None, 'nasdaq': None, 'yfinance': None})
    assert d is None and n == 0


# ------------------------------------------------------------------ refresh

def _patch_sources(monkeypatch, ec, fh=None, nq=None, yf=None):
    monkeypatch.setattr(ec, '_fetch_finnhub', lambda a, b: fh or {})
    monkeypatch.setattr(ec, '_fetch_nasdaq', lambda a, b: nq or {})
    monkeypatch.setattr(ec, '_fetch_yfinance_vote', lambda sym: (yf or {}).get(sym))


def test_refresh_persists_and_confirms(ec, monkeypatch):
    _patch_sources(monkeypatch, ec,
                   fh={'AAPL': {'date': EVENT, 'session': 'amc'}},
                   nq={'AAPL': {'date': EVENT, 'session': 'amc'}},
                   yf={'AAPL': {'date': EVENT_OFF1, 'session': None}})
    res = ec.refresh_universe(['AAPL'])
    assert res['confirmed'] == 1
    ev = ec.confirmed('AAPL')
    assert ev and ev['event_date'] == EVENT and ev['session'] == 'amc'
    assert ev['source_agreement'] == 2


def test_single_source_not_confirmed(ec, monkeypatch):
    _patch_sources(monkeypatch, ec,
                   fh={'MSFT': {'date': EVENT, 'session': 'amc'}})
    ec.refresh_universe(['MSFT'])
    assert ec.next_earnings('MSFT') is not None   # known, but...
    assert ec.confirmed('MSFT') is None           # ...one source ≠ confirmed


def test_unknown_session_not_confirmed(ec, monkeypatch):
    _patch_sources(monkeypatch, ec,
                   fh={'NVDA': {'date': EVENT, 'session': None}},
                   nq={'NVDA': {'date': EVENT, 'session': None}})
    ec.refresh_universe(['NVDA'])
    assert ec.confirmed('NVDA') is None   # 2 sources agree on date, no session


def test_point_in_time_rows_immutable(ec, monkeypatch):
    """Yesterday's verdict survives today's refresh untouched."""
    import modules.paper_trading as pt
    yday = (TODAY - timedelta(days=1)).isoformat()
    with sqlite3.connect(str(pt._DB)) as c:
        c.execute("INSERT INTO earnings_calendar VALUES "
                  "('AAPL', ?, ?, 'bmo', '{}', 3)", (yday, EVENT_OFF1))
        c.commit()
    _patch_sources(monkeypatch, ec,
                   fh={'AAPL': {'date': EVENT, 'session': 'amc'}},
                   nq={'AAPL': {'date': EVENT, 'session': 'amc'}})
    ec.refresh_universe(['AAPL'])
    with sqlite3.connect(str(pt._DB)) as c:
        c.row_factory = sqlite3.Row
        old = c.execute("SELECT * FROM earnings_calendar WHERE fetched_at=?",
                        (yday,)).fetchone()
        n = c.execute("SELECT COUNT(*) FROM earnings_calendar WHERE symbol='AAPL'"
                      ).fetchone()[0]
    assert old['event_date'] == EVENT_OFF1 and old['session'] == 'bmo'
    assert n == 2
    # The latest fetch wins for queries.
    assert ec.confirmed('AAPL')['event_date'] == EVENT


def test_stale_fetch_returns_none(ec, monkeypatch):
    import modules.paper_trading as pt
    old = (TODAY - timedelta(days=5)).isoformat()
    with sqlite3.connect(str(pt._DB)) as c:
        c.execute("INSERT INTO earnings_calendar VALUES "
                  "('TSLA', ?, ?, 'amc', '{}', 3)", (old, EVENT))
        c.commit()
    assert ec.next_earnings('TSLA') is None


def test_finnhub_skips_without_key(ec, monkeypatch):
    monkeypatch.delenv('FINNHUB_API_KEY', raising=False)
    assert ec._fetch_finnhub(TODAY.isoformat(), EVENT) == {}


def test_coverage_stats(ec, monkeypatch):
    _patch_sources(monkeypatch, ec,
                   fh={'AAPL': {'date': EVENT, 'session': 'amc'},
                       'MSFT': {'date': EVENT, 'session': 'amc'}},
                   nq={'AAPL': {'date': EVENT, 'session': 'amc'}})
    ec.refresh_universe(['AAPL', 'MSFT'])
    cov = ec.coverage_stats(['AAPL', 'MSFT', 'NVDA'])   # NVDA never fetched
    assert cov['checked_frac'] == pytest.approx(2 / 3, abs=0.01)
    assert cov['upcoming_events'] == 2
    assert cov['confirmed_frac'] == pytest.approx(0.5)  # only AAPL has 2 votes


# --------------------------------------------------------- straddle gating

def _stub_market(monkeypatch):
    import modules.options_playbook as opb
    closes = [100.0 * (1 + 0.0002 * i) for i in range(260)]
    monkeypatch.setattr(opb, '_fetch',
                        lambda sym, period: (['d'] * 260, closes, closes, closes))
    monkeypatch.setattr(opb, '_price_legs_from_chain', lambda *a, **k: None)
    return opb


def test_straddle_confirmed_amc_closes_on_event_day(ec, monkeypatch):
    opb = _stub_market(monkeypatch)
    monkeypatch.setattr(ec, 'confirmed',
                        lambda sym: ({'symbol': 'AAPL', 'event_date': EVENT,
                                      'session': 'amc', 'source_agreement': 2,
                                      'fetched_at': TODAY.isoformat()}
                                     if sym == 'AAPL' else None))
    recs = opb._play_preearnings_straddle(TODAY.isoformat(),
                                          require_confirmed=True)
    assert len(recs) == 1
    assert recs[0]['symbol'] == 'AAPL'
    assert recs[0]['event_close_date'] == EVENT


def test_straddle_confirmed_bmo_closes_day_before(ec, monkeypatch):
    opb = _stub_market(monkeypatch)
    monkeypatch.setattr(ec, 'confirmed',
                        lambda sym: ({'symbol': 'AAPL', 'event_date': EVENT,
                                      'session': 'bmo', 'source_agreement': 3,
                                      'fetched_at': TODAY.isoformat()}
                                     if sym == 'AAPL' else None))
    recs = opb._play_preearnings_straddle(TODAY.isoformat(),
                                          require_confirmed=True)
    assert len(recs) == 1
    want = (date.fromisoformat(EVENT) - timedelta(days=1)).isoformat()
    assert recs[0]['event_close_date'] == want


def test_straddle_unconfirmed_fires_nothing(ec, monkeypatch):
    opb = _stub_market(monkeypatch)
    monkeypatch.setattr(ec, 'confirmed', lambda sym: None)
    assert opb._play_preearnings_straddle(TODAY.isoformat(),
                                          require_confirmed=True) == []


def test_straddle_legacy_path_unchanged(ec, monkeypatch):
    """Without the flag (frozen straddle trial), yfinance behavior persists."""
    opb = _stub_market(monkeypatch)
    import modules.pro_calendar as pc
    monkeypatch.setattr(
        pc, '_fetch_calendar',
        lambda sym: ({'next_event_type': 'earnings_date', 'next_event_days': 3}
                     if sym == 'NVDA' else None))
    # confirmed() would say no — but legacy mode must not consult it.
    monkeypatch.setattr(ec, 'confirmed', lambda sym: None)
    recs = opb._play_preearnings_straddle(TODAY.isoformat(),
                                          require_confirmed=False)
    assert len(recs) == 1 and recs[0]['symbol'] == 'NVDA'
    assert recs[0]['event_close_date'] == (TODAY + timedelta(days=3)).isoformat()
