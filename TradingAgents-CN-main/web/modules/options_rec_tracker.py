"""
Options-recommender tracker — daily snapshot + at-expiry settlement + MTM.

Captures every recommendation produced by ``pro_options_recommender`` and
``small_capital_recommendations`` once per day. As expiries pass we
compute the realized P&L for each row (per-strategy settlement math).
Open positions get marked to market each tick using a BS proxy on
realized vol so the dashboard can show running P&L.

Result: a verifiable forward track record for the recommendations,
answering "if I had followed every rec, what would my actual P&L be?"

Public:
  init_rec_log_tables()
  snapshot_today(sources, counts, budget)
  settle_expired(today=None)
  mtm_open(today=None)
  summary(days=30)
  list_log(status, source, limit, days)

Storage: ``options_rec_log`` table — one row per (snapshot_date, source,
symbol, strategy). Idempotent on re-snapshot the same day.
"""
from __future__ import annotations

import json
import logging
import math
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger('options_rec_tracker')

_DB = Path(__file__).resolve().parents[1] / 'trading_agents.db'


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(str(_DB), timeout=10.0)
    c.row_factory = sqlite3.Row
    return c


def init_rec_log_tables() -> None:
    with _conn() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS options_rec_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            snapshot_date TEXT NOT NULL,         -- YYYY-MM-DD
            source TEXT NOT NULL,                -- 'daily' | 'small_capital'
            symbol TEXT NOT NULL,
            strategy TEXT NOT NULL,
            strategy_label TEXT,
            bias TEXT,
            legs_json TEXT NOT NULL,
            spot_at_open REAL,
            credit_per_share REAL,
            max_profit_usd REAL,
            max_loss_usd REAL,
            cap_at_risk_usd REAL,
            breakeven_json TEXT,                 -- single float or [lo, hi]
            pop_pct REAL,
            expiry_date TEXT,                    -- YYYY-MM-DD computed from DTE
            iv_rank_pct REAL,
            realized_vol_annual_pct REAL,
            status TEXT DEFAULT 'open',          -- 'open' | 'settled'
            closed_at TEXT,
            spot_at_close REAL,
            realized_pnl_usd REAL,
            realized_outcome TEXT,               -- 'max_profit' | 'max_loss' | 'partial'
            mtm_pnl_usd REAL,                    -- last computed MTM (for open rows)
            mtm_at TEXT,
            note TEXT,
            UNIQUE(snapshot_date, source, symbol, strategy)
        );
        CREATE INDEX IF NOT EXISTS idx_rec_log_date
            ON options_rec_log(snapshot_date DESC);
        CREATE INDEX IF NOT EXISTS idx_rec_log_expiry_status
            ON options_rec_log(expiry_date, status);
        CREATE INDEX IF NOT EXISTS idx_rec_log_symbol
            ON options_rec_log(symbol, snapshot_date DESC);
        ''')
        c.commit()


# ---------------------------------------------------------------------------
# Snapshot — capture today's recommendations
# ---------------------------------------------------------------------------
def _legs_dte(legs: List[Dict[str, Any]]) -> int:
    """Find the (single) DTE shared across legs; recommender always sets
    them identical for one trade."""
    dtes = [int(l.get('dte') or 0) for l in (legs or []) if l.get('dte')]
    return max(dtes) if dtes else 0


def _expiry_from_dte(snapshot_date: str, dte: int) -> Optional[str]:
    if not dte:
        return None
    try:
        d = datetime.fromisoformat(snapshot_date).date()
    except ValueError:
        return None
    return (d + timedelta(days=dte)).isoformat()


def _insert_row(c: sqlite3.Connection,
                snapshot_date: str, source: str,
                rec: Dict[str, Any]) -> int:
    """Insert one rec; return rowcount (0 = dedup'd via UNIQUE)."""
    legs = rec.get('legs', [])
    dte = _legs_dte(legs)
    expiry = _expiry_from_dte(snapshot_date, dte)
    breakeven = rec.get('breakeven')
    cur = c.execute(
        '''INSERT OR IGNORE INTO options_rec_log
           (snapshot_date, source, symbol, strategy, strategy_label, bias,
            legs_json, spot_at_open, credit_per_share, max_profit_usd,
            max_loss_usd, cap_at_risk_usd, breakeven_json, pop_pct,
            expiry_date, iv_rank_pct, realized_vol_annual_pct)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (snapshot_date, source,
         rec.get('symbol', ''), rec.get('strategy', ''),
         rec.get('strategy_label', ''), rec.get('bias', ''),
         json.dumps(legs), float(rec.get('spot') or 0),
         float(rec.get('credit_per_share') or 0),
         float(rec.get('max_profit_usd') or 0),
         float(rec.get('max_loss_usd') or 0),
         float(rec.get('cap_at_risk_usd') or 0),
         json.dumps(breakeven) if breakeven is not None else None,
         float(rec.get('pop_pct') or 0),
         expiry,
         float(rec.get('iv_rank_pct') or 0) if rec.get('iv_rank_pct') is not None else None,
         float(rec.get('realized_vol_annual_pct') or 0) if rec.get('realized_vol_annual_pct') is not None else None,
        ))
    return cur.rowcount


def snapshot_today(sources: Optional[List[str]] = None,
                   daily_count: int = 20,
                   small_cap_count: int = 15,
                   small_cap_budget: float = 2000.0,
                   today: Optional[str] = None) -> Dict[str, Any]:
    """Pull today's recs from the two sources and persist any new rows."""
    init_rec_log_tables()
    today = today or date.today().isoformat()
    sources = sources or ['daily', 'small_capital']
    out: Dict[str, int] = {}

    if 'daily' in sources:
        try:
            try:
                from .pro_options_recommender import daily_recommendations  # type: ignore
            except ImportError:
                from web.modules.pro_options_recommender import daily_recommendations  # type: ignore
            res = daily_recommendations(count=daily_count)
            recs = res.get('recommendations') or []
        except Exception as e:  # noqa: BLE001
            logger.warning(f'daily_recommendations fetch failed: {e}')
            recs = []
        n_new = 0
        with _conn() as c:
            for r in recs:
                n_new += _insert_row(c, today, 'daily', r)
            c.commit()
        out['daily'] = n_new

    if 'small_capital' in sources:
        try:
            try:
                from .pro_options_recommender import small_capital_recommendations  # type: ignore
            except ImportError:
                from web.modules.pro_options_recommender import small_capital_recommendations  # type: ignore
            res = small_capital_recommendations(budget=small_cap_budget,
                                                count=small_cap_count)
            recs = res.get('recommendations') or []
        except Exception as e:  # noqa: BLE001
            logger.warning(f'small_capital_recommendations fetch failed: {e}')
            recs = []
        n_new = 0
        with _conn() as c:
            for r in recs:
                n_new += _insert_row(c, today, 'small_capital', r)
            c.commit()
        out['small_capital'] = n_new

    return {'success': True, 'snapshot_date': today, 'new_rows_by_source': out,
            'total_new_rows': sum(out.values())}


# ---------------------------------------------------------------------------
# Settlement — at-expiry payoff per strategy
# ---------------------------------------------------------------------------
def _settle_short_put(short_strike: float, spot_at_expiry: float,
                      credit_per_share: float) -> Tuple[float, str]:
    """CSP payoff. Long stock = NOT held (cash-secured); P&L tracked per contract.
    Returns (pnl_usd_per_contract, outcome)."""
    if spot_at_expiry >= short_strike:
        return (credit_per_share * 100, 'max_profit')
    # Assigned at strike, immediately sell at spot for the position.
    # Per-contract P&L = (credit + (spot - strike)) * 100
    pnl = (credit_per_share + (spot_at_expiry - short_strike)) * 100
    return (pnl, 'partial' if pnl > -short_strike * 100 + 1 else 'max_loss')


def _settle_short_call(short_strike: float, spot_at_expiry: float,
                       credit_per_share: float,
                       spot_at_open: float) -> Tuple[float, str]:
    """Covered call payoff (long stock + short call)."""
    # If stock called away at strike, P&L on stock = strike - open + credit.
    if spot_at_expiry >= short_strike:
        pnl = (short_strike - spot_at_open + credit_per_share) * 100
        return (pnl, 'max_profit')
    # Else stock keeps moving; assume we mark stock to expiry close.
    pnl = (spot_at_expiry - spot_at_open + credit_per_share) * 100
    outcome = 'partial' if pnl > 0 else 'max_loss'
    return (pnl, outcome)


def _settle_bull_put_spread(short_strike: float, long_strike: float,
                            net_credit: float, spot_at_expiry: float) -> Tuple[float, str]:
    width = short_strike - long_strike
    if spot_at_expiry >= short_strike:
        return (net_credit * 100, 'max_profit')
    if spot_at_expiry <= long_strike:
        return ((net_credit - width) * 100, 'max_loss')
    pnl = (net_credit - (short_strike - spot_at_expiry)) * 100
    return (pnl, 'partial')


def _settle_bear_call_spread(short_strike: float, long_strike: float,
                             net_credit: float, spot_at_expiry: float) -> Tuple[float, str]:
    width = long_strike - short_strike
    if spot_at_expiry <= short_strike:
        return (net_credit * 100, 'max_profit')
    if spot_at_expiry >= long_strike:
        return ((net_credit - width) * 100, 'max_loss')
    pnl = (net_credit - (spot_at_expiry - short_strike)) * 100
    return (pnl, 'partial')


def _settle_iron_condor(put_short: float, put_long: float,
                        call_short: float, call_long: float,
                        net_credit: float, spot_at_expiry: float) -> Tuple[float, str]:
    width = max(put_short - put_long, call_long - call_short)
    if put_short < spot_at_expiry < call_short:
        return (net_credit * 100, 'max_profit')
    if spot_at_expiry <= put_long or spot_at_expiry >= call_long:
        return ((net_credit - width) * 100, 'max_loss')
    if spot_at_expiry <= put_short:
        pnl = (net_credit - (put_short - spot_at_expiry)) * 100
    else:
        pnl = (net_credit - (spot_at_expiry - call_short)) * 100
    return (pnl, 'partial')


def _legs_strikes(legs: List[Dict[str, Any]]) -> Dict[str, float]:
    """Index legs by (action, type) → strike. Recommender format:
    legs = [{action: 'sell'|'buy', type: 'put'|'call'|'stock', strike, dte}]"""
    out: Dict[str, float] = {}
    for l in legs or []:
        action = (l.get('action') or '').lower()
        typ = (l.get('type') or '').lower()
        key = f'{action}_{typ}'
        if l.get('strike') is not None:
            try:
                out[key] = float(l['strike'])
            except (TypeError, ValueError):
                pass
    return out


def _fetch_spot_at(symbol: str, target_date: str) -> Optional[float]:
    """Fetch the close price on (or just after) target_date."""
    try:
        try:
            from .pro_backtest import _fetch  # type: ignore
        except ImportError:
            from web.modules.pro_backtest import _fetch  # type: ignore
    except Exception:
        return None
    data = _fetch(symbol, '6mo')
    if not data:
        return None
    dates, closes, _, _ = data
    target = target_date
    chosen: Optional[float] = None
    # Find first bar >= target_date
    for d, c in zip(dates, closes):
        if d >= target:
            chosen = float(c)
            break
    # If target was after the last bar, take the most recent close.
    if chosen is None and closes:
        chosen = float(closes[-1])
    return chosen


def _compute_realized_pnl(row: sqlite3.Row, spot_at_expiry: float) -> Tuple[float, str]:
    """Dispatch by strategy → realized P&L per contract + outcome label."""
    legs = json.loads(row['legs_json'] or '[]')
    strikes = _legs_strikes(legs)
    credit = float(row['credit_per_share'] or 0)
    strategy = (row['strategy'] or '').lower()
    spot_open = float(row['spot_at_open'] or 0)

    if strategy in ('cash_secured_put', 'csp'):
        return _settle_short_put(strikes.get('sell_put', 0), spot_at_expiry, credit)
    if strategy in ('covered_call', 'cc'):
        return _settle_short_call(strikes.get('sell_call', 0), spot_at_expiry,
                                  credit, spot_open)
    if strategy in ('bull_put_spread',):
        return _settle_bull_put_spread(strikes.get('sell_put', 0),
                                       strikes.get('buy_put', 0),
                                       credit, spot_at_expiry)
    if strategy in ('bear_call_spread',):
        return _settle_bear_call_spread(strikes.get('sell_call', 0),
                                        strikes.get('buy_call', 0),
                                        credit, spot_at_expiry)
    if strategy in ('iron_condor',):
        return _settle_iron_condor(strikes.get('sell_put', 0),
                                   strikes.get('buy_put', 0),
                                   strikes.get('sell_call', 0),
                                   strikes.get('buy_call', 0),
                                   credit, spot_at_expiry)
    if strategy in ('long_straddle',):
        # P3 — debit play: credit_per_share is stored NEGATIVE (the debit
        # paid). Payoff at expiry = |spot − K| per share; P&L = payoff + credit.
        k = strikes.get('buy_call', 0) or strikes.get('buy_put', 0)
        payoff = abs(spot_at_expiry - k) if k > 0 else 0.0
        pnl = (payoff + credit) * 100
        return (pnl, 'win' if pnl > 0 else 'loss')
    # Unknown — degrade to "credit kept" so we don't crash; flag as partial.
    return (credit * 100, 'partial')


def settle_expired(today: Optional[str] = None) -> Dict[str, Any]:
    """Find every 'open' row whose expiry_date ≤ today and compute realized
    P&L using actual close on (or just after) the expiry date."""
    init_rec_log_tables()
    today = today or date.today().isoformat()
    with _conn() as c:
        rows = c.execute(
            '''SELECT * FROM options_rec_log
               WHERE status='open' AND expiry_date IS NOT NULL
                 AND expiry_date <= ?''', (today,)).fetchall()
    settled: List[Dict[str, Any]] = []
    for r in rows:
        spot_exp = _fetch_spot_at(r['symbol'], r['expiry_date'])
        if spot_exp is None:
            continue
        pnl, outcome = _compute_realized_pnl(r, spot_exp)
        with _conn() as c:
            c.execute(
                '''UPDATE options_rec_log
                   SET status='settled', closed_at=?, spot_at_close=?,
                       realized_pnl_usd=?, realized_outcome=?,
                       mtm_pnl_usd=NULL, mtm_at=NULL
                   WHERE id=?''',
                (today, spot_exp, pnl, outcome, r['id']))
            c.commit()
        settled.append({
            'id': r['id'], 'symbol': r['symbol'], 'strategy': r['strategy'],
            'snapshot_date': r['snapshot_date'], 'expiry_date': r['expiry_date'],
            'spot_at_open': r['spot_at_open'], 'spot_at_expiry': round(spot_exp, 2),
            'realized_pnl_usd': round(pnl, 2), 'outcome': outcome,
        })
    return {'success': True, 'settled_count': len(settled), 'settled': settled}


# ---------------------------------------------------------------------------
# Mark-to-market — for still-open recs
# ---------------------------------------------------------------------------
def _bs_value_per_share(spot: float, strike: float, vol: float,
                        dte_days: int, option_type: str) -> float:
    try:
        try:
            from .pro_options import black_scholes  # type: ignore
        except ImportError:
            from web.modules.pro_options import black_scholes  # type: ignore
    except ImportError:
        return 0.0
    if dte_days <= 0:
        # At-or-past expiry intrinsic only.
        if option_type == 'put':
            return max(0.0, strike - spot)
        return max(0.0, spot - strike)
    g = black_scholes(spot, strike, max(1, dte_days) / 365.0, 0.045,
                      max(0.05, vol), option_type=option_type)
    return float(g['price'])


def _current_spot_and_vol(symbol: str) -> Optional[Tuple[float, float]]:
    try:
        try:
            from .pro_backtest import _fetch  # type: ignore
        except ImportError:
            from web.modules.pro_backtest import _fetch  # type: ignore
        from .pro_options_recommender import _realized_vol_annual  # type: ignore
    except ImportError:
        try:
            from web.modules.pro_options_recommender import _realized_vol_annual  # type: ignore
        except ImportError:
            return None
    data = _fetch(symbol, '1y')
    if not data or not data[1]:
        return None
    closes = data[1]
    spot = float(closes[-1])
    vol = _realized_vol_annual(closes, 30)
    if spot <= 0 or vol <= 0:
        return None
    return (spot, vol)


def _chain_liability_per_share(symbol: str, expiry_iso: str,
                               legs: List[Dict[str, Any]]) -> Optional[float]:
    """P6 — net cost-to-close per share from REAL chain mids:
    +mid for each short leg (pay to buy back), −mid for each long leg
    (receive on sale). Returns None when the chain / a leg's strike isn't
    available with a two-sided market — caller falls back to B-S.

    Why this exists: the B-S fallback prices off REALIZED vol, so marks
    carry no implied-vol dimension at all. Plays whose economics are IV
    moves (the pre-earnings straddle's run-up, credit plays' vol crush)
    were invisible to a B-S-only mark.
    """
    try:
        try:
            from .option_chain import fetch_chain, fetch_expirations
        except ImportError:
            from web.modules.option_chain import fetch_chain, fetch_expirations  # type: ignore
        target = datetime.fromisoformat(expiry_iso).date()
        # Synth-Friday expiries may not be listed — mark off the nearest
        # listed expiry within a small tolerance (same strikes, ~same value).
        best_exp, best_gap = None, 99
        for e in (fetch_expirations(symbol) or []):
            try:
                gap = abs((datetime.strptime(e, '%Y-%m-%d').date() - target).days)
            except ValueError:
                continue
            if gap < best_gap:
                best_exp, best_gap = e, gap
        if best_exp is None or best_gap > 5:
            return None
        chain = fetch_chain(symbol, best_exp)
        if not chain:
            return None
    except Exception:
        return None

    rows_by_side = {'call': chain.get('calls') or [], 'put': chain.get('puts') or []}
    liability = 0.0
    priced_any = False
    for l in legs:
        action = (l.get('action') or '').lower()
        typ = (l.get('type') or '').lower()
        if typ not in ('put', 'call'):
            continue
        strike = float(l.get('strike') or 0)
        match = None
        for r in rows_by_side[typ]:
            if (abs(float(r.get('strike') or 0) - strike) < 0.011
                    and r.get('bid', 0) > 0 and r.get('ask', 0) > 0):
                match = r
                break
        if match is None:
            return None  # one unmarkable leg → whole position falls back to B-S
        mid = float(match.get('mid') or 0)
        if mid <= 0:
            return None
        liability += mid if action == 'sell' else -mid
        priced_any = True
    return liability if priced_any else None


def _mtm_per_contract(row: sqlite3.Row, today: str) -> Optional[float]:
    """Compute current MTM P&L per contract for an open row.

    P6: marks prefer REAL chain mids (carrying implied vol); the B-S proxy
    on realized vol below is the offline/illiquid fallback.

    Convention: short premium → MTM = (credit_collected - cost_to_close) × 100.
    For multi-leg, net it by summing signed legs:
       - short leg: + (current price paid to buy back)
       - long leg:  - (current price received on sale)
    The recommender always nets credit_per_share at open; at MTM we
    recompute leg-by-leg.
    """
    legs_for_chain = json.loads(row['legs_json'] or '[]')
    if row['expiry_date']:
        chain_liab = _chain_liability_per_share(
            row['symbol'], row['expiry_date'], legs_for_chain)
        if chain_liab is not None:
            credit = float(row['credit_per_share'] or 0)
            return (credit - chain_liab) * 100

    sv = _current_spot_and_vol(row['symbol'])
    if not sv:
        return None
    spot, vol = sv
    try:
        exp = datetime.fromisoformat(row['expiry_date']).date()
        td = datetime.fromisoformat(today).date()
    except (TypeError, ValueError):
        return None
    dte = max(0, (exp - td).days)
    legs = json.loads(row['legs_json'] or '[]')
    # Cost to close = + (price of each short leg) - (price of each long leg).
    # We collected `credit_per_share` at open; current liability per share =
    # sum of (signed) leg BS values. Net P&L = collected_premium - liability.
    liability = 0.0
    for l in legs:
        action = (l.get('action') or '').lower()
        typ = (l.get('type') or '').lower()
        strike = float(l.get('strike') or 0)
        if typ not in ('put', 'call') or strike <= 0:
            continue
        bs = _bs_value_per_share(spot, strike, vol, dte, typ)
        if action == 'sell':
            liability += bs   # we'd pay to buy back
        elif action == 'buy':
            liability -= bs   # our long leg is worth this (offsets)
    credit = float(row['credit_per_share'] or 0)
    mtm = (credit - liability) * 100
    return mtm


def mtm_open(today: Optional[str] = None) -> Dict[str, Any]:
    """Update mtm_pnl_usd / mtm_at on every open row."""
    init_rec_log_tables()
    today = today or date.today().isoformat()
    with _conn() as c:
        rows = c.execute(
            '''SELECT id, symbol, expiry_date, legs_json, credit_per_share
               FROM options_rec_log
               WHERE status='open' ''').fetchall()
    updated = 0
    for r in rows:
        mtm = _mtm_per_contract(r, today)
        if mtm is None:
            continue
        with _conn() as c:
            c.execute(
                'UPDATE options_rec_log SET mtm_pnl_usd=?, mtm_at=? WHERE id=?',
                (round(mtm, 2), today, r['id']))
            c.commit()
        updated += 1
    return {'success': True, 'mtm_updated': updated, 'mtm_at': today}


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------
def list_log(status: Optional[str] = None,
             source: Optional[str] = None,
             days: int = 60,
             limit: int = 200) -> List[Dict[str, Any]]:
    init_rec_log_tables()
    since = (date.today() - timedelta(days=days)).isoformat()
    sql = '''SELECT id, snapshot_date, source, symbol, strategy, strategy_label,
                    bias, spot_at_open, credit_per_share, max_profit_usd,
                    max_loss_usd, cap_at_risk_usd, breakeven_json, pop_pct,
                    expiry_date, iv_rank_pct, status, closed_at,
                    spot_at_close, realized_pnl_usd, realized_outcome,
                    mtm_pnl_usd, mtm_at, legs_json
             FROM options_rec_log WHERE snapshot_date >= ?'''
    args: List[Any] = [since]
    if status:
        sql += ' AND status=?'; args.append(status)
    if source:
        sql += ' AND source=?'; args.append(source)
    sql += ' ORDER BY snapshot_date DESC, id DESC LIMIT ?'
    args.append(limit)
    with _conn() as c:
        rows = c.execute(sql, args).fetchall()
    out: List[Dict[str, Any]] = []
    for r in rows:
        d = dict(r)
        try:
            d['breakeven'] = json.loads(d.get('breakeven_json') or 'null')
        except Exception:
            d['breakeven'] = None
        try:
            d['legs'] = json.loads(d.get('legs_json') or '[]')
        except Exception:
            d['legs'] = []
        out.append(d)
    return out


def summary(days: int = 30) -> Dict[str, Any]:
    """Aggregate stats: total realized P&L, win rate, current open MTM, by
    strategy and by source."""
    init_rec_log_tables()
    since = (date.today() - timedelta(days=days)).isoformat()
    with _conn() as c:
        all_rows = c.execute(
            '''SELECT source, strategy, status, realized_pnl_usd, mtm_pnl_usd,
                      cap_at_risk_usd
               FROM options_rec_log WHERE snapshot_date >= ?''',
            (since,)).fetchall()

    settled = [r for r in all_rows if r['status'] == 'settled' and r['realized_pnl_usd'] is not None]
    open_rows = [r for r in all_rows if r['status'] == 'open']
    wins = sum(1 for r in settled if float(r['realized_pnl_usd']) > 0)
    losses = len(settled) - wins
    realized_total = sum(float(r['realized_pnl_usd']) for r in settled)
    cap_at_risk_total = sum(float(r['cap_at_risk_usd'] or 0) for r in settled)
    open_mtm_total = sum(float(r['mtm_pnl_usd'] or 0) for r in open_rows)
    open_cap_total = sum(float(r['cap_at_risk_usd'] or 0) for r in open_rows)

    by_strategy: Dict[str, Dict[str, Any]] = {}
    for r in settled:
        b = by_strategy.setdefault(r['strategy'], {
            'count': 0, 'wins': 0, 'realized_pnl_usd': 0.0,
            'cap_at_risk_usd': 0.0,
        })
        b['count'] += 1
        if float(r['realized_pnl_usd']) > 0:
            b['wins'] += 1
        b['realized_pnl_usd'] += float(r['realized_pnl_usd'])
        b['cap_at_risk_usd'] += float(r['cap_at_risk_usd'] or 0)

    by_source: Dict[str, Dict[str, Any]] = {}
    for r in settled:
        b = by_source.setdefault(r['source'], {
            'count': 0, 'wins': 0, 'realized_pnl_usd': 0.0,
        })
        b['count'] += 1
        if float(r['realized_pnl_usd']) > 0:
            b['wins'] += 1
        b['realized_pnl_usd'] += float(r['realized_pnl_usd'])

    return {
        'days': days,
        'totals': {
            'settled_count': len(settled),
            'open_count': len(open_rows),
            'wins': wins, 'losses': losses,
            'win_rate_pct': round(wins / max(1, len(settled)) * 100, 1),
            'realized_pnl_usd': round(realized_total, 2),
            'realized_pnl_pct_of_risk': round(
                realized_total / max(1.0, cap_at_risk_total) * 100, 2),
            'open_mtm_pnl_usd': round(open_mtm_total, 2),
            'open_cap_at_risk_usd': round(open_cap_total, 2),
        },
        'by_strategy': {
            k: {**v,
                'win_rate_pct': round(v['wins'] / max(1, v['count']) * 100, 1),
                'realized_pnl_usd': round(v['realized_pnl_usd'], 2),
                'roi_pct': round(v['realized_pnl_usd']
                                 / max(1.0, v['cap_at_risk_usd']) * 100, 2)}
            for k, v in by_strategy.items()
        },
        'by_source': {
            k: {**v,
                'win_rate_pct': round(v['wins'] / max(1, v['count']) * 100, 1),
                'realized_pnl_usd': round(v['realized_pnl_usd'], 2)}
            for k, v in by_source.items()
        },
    }


def daily_pnl_curve(days: int = 60) -> List[Dict[str, Any]]:
    """Cumulative-P&L curve: one row per date with sum-realized to that day."""
    init_rec_log_tables()
    since = (date.today() - timedelta(days=days)).isoformat()
    with _conn() as c:
        rows = c.execute(
            '''SELECT closed_at AS d, SUM(realized_pnl_usd) AS pnl
               FROM options_rec_log
               WHERE status='settled' AND closed_at IS NOT NULL
                 AND closed_at >= ?
               GROUP BY closed_at ORDER BY closed_at''',
            (since,)).fetchall()
    cum = 0.0
    curve: List[Dict[str, Any]] = []
    for r in rows:
        cum += float(r['pnl'] or 0)
        curve.append({'date': r['d'],
                      'daily_pnl_usd': round(float(r['pnl'] or 0), 2),
                      'cumulative_pnl_usd': round(cum, 2)})
    return curve
