"""
E1 — Dual-source earnings calendar with cross-source agreement gating.

Why this exists: the pre-earnings straddle play enters T−3 and force-closes
AT the announcement — an earnings date that is off by one day flips the
trade from "harvest the IV run-up" to "hold a long straddle through the
print", the exact thing the playbook forbids. yfinance earnings dates have
documented off-by-one and missing-date bugs (timezone handling, stale
scrapes), and the old path had no second opinion and no failure signal.

Design:
  - Three independent votes per symbol: Finnhub /calendar/earnings (keyed,
    has a session/hour field), Nasdaq's public calendar API (keyless,
    session field, needs a browser User-Agent), and yfinance via
    pro_calendar._fetch_calendar (date only, no session).
  - Point-in-time persistence: one row per (symbol, fetch-day), NEVER
    updated after the fetch day — so future research can know what the
    calendar said at the time, not what it says now.
  - confirmed(sym) returns an event only when >=2 sources agree on the DATE
    and the SESSION is known (bmo/amc) — the straddle's entry gate.
    'dmh' (during market hours) and unknown sessions stay unconfirmed: an
    exit timed against an unknown session is a coin flip.
  - Consumers fall back to the legacy yfinance path whenever this module
    has nothing (missing keys, blocked endpoints, fresh installs) — the
    calendar must never be the reason the blackout gate turns off.
"""
from __future__ import annotations

import json
import os
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Sequence

_HORIZON_DAYS = 21
_FRESH_DAYS = 2          # a fetch older than this no longer counts as coverage
_NASDAQ_UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
              'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36')

_SESSION_MAP_FINNHUB = {'bmo': 'bmo', 'amc': 'amc', 'dmh': 'dmh'}
_SESSION_MAP_NASDAQ = {'time-pre-market': 'bmo', 'time-after-hours': 'amc',
                       'time-not-supplied': None}


def _conn():
    try:
        from . import paper_trading as _pt
    except Exception:
        from web.modules import paper_trading as _pt  # type: ignore
    return _pt._conn()


def init_earnings_tables() -> None:
    with _conn() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS earnings_calendar (
            symbol TEXT NOT NULL,
            fetched_at TEXT NOT NULL,        -- ISO fetch date (point-in-time key)
            event_date TEXT,                 -- NULL = checked, none upcoming
            session TEXT,                    -- 'bmo' | 'amc' | 'dmh' | NULL
            sources_json TEXT NOT NULL,      -- per-source raw votes
            source_agreement INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (symbol, fetched_at)
        );
        CREATE INDEX IF NOT EXISTS idx_earn_cal_sym
            ON earnings_calendar(symbol, fetched_at DESC);
        ''')
        c.commit()


# ---------------------------------------------------------------------------
# Source fetchers — each returns {SYMBOL: {'date': iso, 'session': str|None}}
# ---------------------------------------------------------------------------

def _fetch_finnhub(start_iso: str, end_iso: str) -> Dict[str, Dict[str, Any]]:
    key = os.getenv('FINNHUB_API_KEY')
    if not key:
        return {}
    try:
        import finnhub
        client = finnhub.Client(api_key=key)
        res = client.earnings_calendar(_from=start_iso, to=end_iso,
                                       symbol='', international=False)
    except Exception:
        return {}
    out: Dict[str, Dict[str, Any]] = {}
    for row in (res or {}).get('earningsCalendar', []) or []:
        sym = (row.get('symbol') or '').upper()
        d = row.get('date')
        if not sym or not d:
            continue
        sess = _SESSION_MAP_FINNHUB.get((row.get('hour') or '').lower())
        prev = out.get(sym)
        # Keep the EARLIEST upcoming date per symbol.
        if prev is None or d < prev['date']:
            out[sym] = {'date': d, 'session': sess}
    return out


def _fetch_nasdaq_day(date_iso: str) -> Dict[str, Dict[str, Any]]:
    """One day of Nasdaq's public earnings calendar. Best-effort."""
    try:
        import requests
        r = requests.get(
            'https://api.nasdaq.com/api/calendar/earnings',
            params={'date': date_iso},
            headers={'User-Agent': _NASDAQ_UA, 'Accept': 'application/json'},
            timeout=10)
        rows = (((r.json() or {}).get('data') or {}).get('rows')) or []
    except Exception:
        return {}
    out: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        sym = (row.get('symbol') or '').upper()
        if not sym:
            continue
        sess = _SESSION_MAP_NASDAQ.get((row.get('time') or '').lower())
        out[sym] = {'date': date_iso, 'session': sess}
    return out


def _fetch_nasdaq(start_iso: str, end_iso: str) -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    try:
        d = date.fromisoformat(start_iso)
        end = date.fromisoformat(end_iso)
    except ValueError:
        return out
    while d <= end:
        if d.weekday() < 5:  # trading days only
            for sym, v in _fetch_nasdaq_day(d.isoformat()).items():
                if sym not in out or v['date'] < out[sym]['date']:
                    out[sym] = v
        d += timedelta(days=1)
    return out


def _fetch_yfinance_vote(symbol: str) -> Optional[Dict[str, Any]]:
    """Third vote: legacy yfinance path (date only — yfinance carries no
    session info)."""
    try:
        try:
            from .pro_calendar import _fetch_calendar
        except ImportError:
            from web.modules.pro_calendar import _fetch_calendar  # type: ignore
        cal = _fetch_calendar(symbol)
    except Exception:
        return None
    if cal and cal.get('earnings_date'):
        return {'date': cal['earnings_date'], 'session': None}
    return None


# ---------------------------------------------------------------------------
# Refresh + queries
# ---------------------------------------------------------------------------

def _consensus(votes: Dict[str, Optional[Dict[str, Any]]]):
    """(event_date, session, agreement) from per-source votes. Date = modal
    date among voting sources; session = first known session among the
    sources that voted FOR the modal date (Finnhub preferred over Nasdaq)."""
    dated = {src: v for src, v in votes.items() if v and v.get('date')}
    if not dated:
        return None, None, 0
    counts: Dict[str, int] = {}
    for v in dated.values():
        counts[v['date']] = counts.get(v['date'], 0) + 1
    modal_date = max(counts, key=lambda d: (counts[d], d == min(counts)))
    agreement = counts[modal_date]
    session = None
    for src in ('finnhub', 'nasdaq', 'yfinance'):
        v = dated.get(src)
        if v and v['date'] == modal_date and v.get('session') in ('bmo', 'amc', 'dmh'):
            session = v['session']
            break
    return modal_date, session, agreement


def refresh_universe(symbols: Sequence[str],
                     horizon_days: int = _HORIZON_DAYS) -> Dict[str, Any]:
    """Nightly job: fetch all three sources over the horizon and persist one
    point-in-time row per symbol for today."""
    init_earnings_tables()
    today = date.today()
    start_iso = today.isoformat()
    end_iso = (today + timedelta(days=horizon_days)).isoformat()
    symbols = [s.upper() for s in symbols if s and not s.endswith('.HK')
               and not s.endswith('.SS') and not s.endswith('.SZ')
               and '-' not in s]  # US earnings calendars only

    fh = _fetch_finnhub(start_iso, end_iso)
    nq = _fetch_nasdaq(start_iso, end_iso)

    written = 0
    confirmed_n = 0
    with _conn() as c:
        for sym in symbols:
            votes = {
                'finnhub': fh.get(sym),
                'nasdaq': nq.get(sym),
                'yfinance': _fetch_yfinance_vote(sym),
            }
            event_date, session, agreement = _consensus(votes)
            c.execute(
                '''INSERT OR REPLACE INTO earnings_calendar
                   (symbol, fetched_at, event_date, session, sources_json,
                    source_agreement)
                   VALUES (?, ?, ?, ?, ?, ?)''',
                (sym, start_iso, event_date, session,
                 json.dumps(votes), agreement))
            written += 1
            if event_date and agreement >= 2 and session in ('bmo', 'amc'):
                confirmed_n += 1
        c.commit()
    return {'success': True, 'fetched_at': start_iso, 'symbols': written,
            'finnhub_rows': len(fh), 'nasdaq_rows': len(nq),
            'confirmed': confirmed_n}


def _latest_row(symbol: str):
    init_earnings_tables()
    with _conn() as c:
        return c.execute(
            'SELECT * FROM earnings_calendar WHERE symbol=? '
            'ORDER BY fetched_at DESC LIMIT 1', (symbol.upper(),)).fetchone()


def next_earnings(symbol: str) -> Optional[Dict[str, Any]]:
    """Most recent fetch's verdict for this symbol, if it names an upcoming
    event. None = no row / stale fetch / no upcoming event known."""
    row = _latest_row(symbol)
    if not row:
        return None
    try:
        age = (date.today() - date.fromisoformat(row['fetched_at'])).days
    except ValueError:
        return None
    if age > _FRESH_DAYS:
        return None
    if not row['event_date'] or row['event_date'] < date.today().isoformat():
        return None
    return {'symbol': row['symbol'], 'event_date': row['event_date'],
            'session': row['session'],
            'source_agreement': int(row['source_agreement'] or 0),
            'fetched_at': row['fetched_at']}


def confirmed(symbol: str) -> Optional[Dict[str, Any]]:
    """The straddle's entry gate: an upcoming event with >=2 sources agreeing
    on the date AND a known bmo/amc session. Anything weaker returns None."""
    ev = next_earnings(symbol)
    if not ev:
        return None
    if ev['source_agreement'] >= 2 and ev['session'] in ('bmo', 'amc'):
        return ev
    return None


def coverage_stats(symbols: Sequence[str]) -> Dict[str, Any]:
    """For the digest / tick warning: how much of this universe did the last
    refresh actually cover, and how much of the covered upcoming-event set
    is fully confirmed?"""
    init_earnings_tables()
    today = date.today().isoformat()
    checked = 0
    upcoming = 0
    confirmed_n = 0
    syms = [s.upper() for s in symbols]
    with _conn() as c:
        for sym in syms:
            row = c.execute(
                'SELECT * FROM earnings_calendar WHERE symbol=? '
                'ORDER BY fetched_at DESC LIMIT 1', (sym,)).fetchone()
            if not row:
                continue
            try:
                age = (date.today() - date.fromisoformat(row['fetched_at'])).days
            except ValueError:
                continue
            if age > _FRESH_DAYS:
                continue
            checked += 1
            if row['event_date'] and row['event_date'] >= today:
                upcoming += 1
                if (int(row['source_agreement'] or 0) >= 2
                        and row['session'] in ('bmo', 'amc')):
                    confirmed_n += 1
    n = len(syms) or 1
    return {
        'universe': len(syms),
        'checked_frac': round(checked / n, 3),
        'upcoming_events': upcoming,
        'confirmed_frac': round(confirmed_n / upcoming, 3) if upcoming else None,
        'asof': today,
    }
