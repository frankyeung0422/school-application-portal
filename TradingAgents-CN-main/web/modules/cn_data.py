"""
E3 — Mainland A-share daily bars behind the pro_backtest._fetch interface.

yfinance's .SS/.SZ coverage is patchy (works for some mega-caps, silently
empty or truncated for others), so pro_backtest delegates here when its
yfinance result looks broken — and ONLY then, and ONLY for CN symbols, so
every existing US/HK/crypto consumer stays byte-identical.

Source order:
  1. tushare pro (keyed via TUSHARE_TOKEN; 500 calls/min on the free tier;
     stable, documented) — reuses the repo's existing provider plumbing in
     tradingagents.dataflows when importable, falls back to a direct
     tushare client otherwise.
  2. akshare (keyless scraper over East Money/Sina; breaks when upstream
     markup changes) — gap-filler, not the backbone.

Symbol mapping: 600519.SS → 600519.SH (tushare) / '600519' (akshare);
000001.SZ → 000001.SZ / '000001'.

Returns are shaped EXACTLY like pro_backtest._fetch/_fetch_full:
  fetch_daily      → (dates, closes, highs, lows)
  fetch_daily_full → (dates, opens, closes, highs, lows, volumes)
"""
from __future__ import annotations

import os
import time
from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple

_PERIOD_DAYS = {'3mo': 90, '6mo': 182, '1y': 365, '2y': 730, '5y': 1825}

_CACHE: Dict[str, tuple] = {}
_CACHE_TTL = 4 * 3600


def _cached(key: str, fn):
    now = time.time()
    if key in _CACHE:
        ts, v = _CACHE[key]
        if now - ts < _CACHE_TTL:
            return v
    v = fn()
    if v is not None:  # don't cache failures — the next call may succeed
        _CACHE[key] = (now, v)
    return v


def is_cn_symbol(symbol: str) -> bool:
    s = (symbol or '').upper()
    return s.endswith('.SS') or s.endswith('.SZ')


def _to_tushare(symbol: str) -> str:
    s = symbol.upper()
    if s.endswith('.SS'):
        return s[:-3] + '.SH'
    return s  # .SZ is already tushare's suffix


def _to_akshare(symbol: str) -> str:
    return symbol.upper().split('.')[0]


def _start_date(period: str) -> str:
    days = _PERIOD_DAYS.get((period or '1y').lower(), 365)
    return (date.today() - timedelta(days=days)).strftime('%Y%m%d')


# ---------------------------------------------------------------------------
# Sources — each returns rows [(date_iso, open, close, high, low, volume)]
# ascending by date, or None on failure.
# ---------------------------------------------------------------------------

def _rows_tushare(symbol: str, period: str):
    token = os.getenv('TUSHARE_TOKEN')
    if not token:
        return None
    try:
        import tushare as ts
        pro = ts.pro_api(token)
        df = pro.daily(ts_code=_to_tushare(symbol),
                       start_date=_start_date(period),
                       end_date=date.today().strftime('%Y%m%d'))
        if df is None or df.empty:
            return None
        df = df.sort_values('trade_date')
        rows = []
        for _, r in df.iterrows():
            d = str(r['trade_date'])
            rows.append((f'{d[:4]}-{d[4:6]}-{d[6:8]}',
                         float(r['open']), float(r['close']),
                         float(r['high']), float(r['low']),
                         float(r.get('vol') or 0) * 100))  # vol is in lots
        return rows or None
    except Exception:
        return None


def _rows_akshare(symbol: str, period: str):
    try:
        import akshare as ak
        s = _start_date(period)
        df = ak.stock_zh_a_hist(symbol=_to_akshare(symbol), period='daily',
                                start_date=s,
                                end_date=date.today().strftime('%Y%m%d'),
                                adjust='qfq')
        if df is None or df.empty:
            return None
        rows = []
        for _, r in df.iterrows():
            d = str(r['日期'])[:10]
            rows.append((d, float(r['开盘']), float(r['收盘']),
                         float(r['最高']), float(r['最低']),
                         float(r.get('成交量') or 0)))
        return rows or None
    except Exception:
        return None


def _rows(symbol: str, period: str):
    def compute():
        return _rows_tushare(symbol, period) or _rows_akshare(symbol, period)
    return _cached(f'cn::{symbol.upper()}::{period}', compute)


# ---------------------------------------------------------------------------
# Public — pro_backtest-shaped tuples
# ---------------------------------------------------------------------------

def fetch_daily(symbol: str, period: str = '1y'
                ) -> Optional[Tuple[List, List, List, List]]:
    rows = _rows(symbol, period)
    if not rows:
        return None
    dates = [r[0] for r in rows]
    closes = [r[2] for r in rows]
    highs = [r[3] for r in rows]
    lows = [r[4] for r in rows]
    return dates, closes, highs, lows


def fetch_daily_full(symbol: str, period: str = '1y'
                     ) -> Optional[Tuple[List, List, List, List, List, List]]:
    rows = _rows(symbol, period)
    if not rows:
        return None
    dates = [r[0] for r in rows]
    opens = [r[1] for r in rows]
    closes = [r[2] for r in rows]
    highs = [r[3] for r in rows]
    lows = [r[4] for r in rows]
    volumes = [r[5] for r in rows]
    return dates, opens, closes, highs, lows, volumes
