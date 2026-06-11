"""
Paper-trading engine — persistent simulated trading using AI/strategy signals.

State lives in trading_agents.db across these tables:
- paper_accounts        : per-user paper accounts with their plan
- paper_positions       : open + closed positions
- paper_transactions    : every buy/sell event
- paper_equity_history  : daily equity snapshots

The day-by-day tick uses the same strategy/combine logic as the autotrade
simulator, but persists state so the user can run it nightly (or click
"catch up to today") and watch a real long-running portfolio.
"""
from __future__ import annotations

import json
import logging
import logging.handlers
import os
import sqlite3
import threading
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Module logger — rotating file at web/logs/paper_trading.log so we have an
# actual forensic trail when accounts misbehave (the old print() lines went
# to whatever stdout the API server happened to have, which is rotated by
# whichever .bat script started it — i.e., effectively lost).
# ---------------------------------------------------------------------------
_LOG_DIR = Path(__file__).resolve().parents[1] / 'logs'
_LOG_DIR.mkdir(exist_ok=True)
logger = logging.getLogger('paper_trading')
if not logger.handlers:
    logger.setLevel(logging.INFO)
    _h = logging.handlers.RotatingFileHandler(
        str(_LOG_DIR / 'paper_trading.log'),
        maxBytes=2_000_000, backupCount=5, encoding='utf-8',
    )
    _h.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s %(name)s acct=%(account)s %(message)s',
        defaults={'account': '-'}))
    logger.addHandler(_h)
    logger.propagate = False


def _log(account_id, level: str, msg: str, **kw) -> None:
    """Structured-ish log helper. Adds account_id to the LogRecord adapter."""
    extra = {'account': account_id if account_id is not None else '-'}
    if kw:
        msg = f"{msg} | " + ' '.join(f"{k}={v}" for k, v in kw.items())
    getattr(logger, level)(msg, extra=extra)

try:
    from modules.pro_backtest import _fetch
except Exception:
    from web.modules.pro_backtest import _fetch  # type: ignore

try:
    from modules.autotrade_sim import _combine_signals, _build_signals
except Exception:
    from web.modules.autotrade_sim import _combine_signals, _build_signals  # type: ignore


def _build_exit_signals(strategies: List[str], entry_combine_mode: str,
                        closes: List[float], highs: List[float],
                        lows: List[float]) -> List[int]:
    """
    Build a separate "exit signal" array that mirrors the entry combine but
    one step softer, fixing the long-standing asymmetry where entries use a
    relaxed `combined == 1` rule but exits required a strict 1→0 crossing of
    the same combined array — which, under `combine_mode='any'` with N
    strategies, almost never happened (would need ALL N to simultaneously
    flip off). The symptom was accounts that bought and never sold.

    Exit policy:
      - 'any' entry  → exit combine is 'majority' (sell when most strategies
                       no longer like the trade, not just when all give up)
      - 'majority'   → exit combine is 'all'      (sell only when no strategy
                       still likes it — preserves the user's looser bias)
      - 'all' entry  → exit combine stays 'all'    (already symmetric)

    Returns 1 = "exit / no longer hold", 0 = "still hold".
    """
    mode = (entry_combine_mode or 'any').lower()
    exit_mode = {'any': 'majority', 'majority': 'all', 'all': 'all'}.get(mode, 'majority')
    raw = _combine_signals(strategies, exit_mode, closes, highs, lows)
    # raw==1 means "buy" under exit_mode → we DO want to hold; flip to "hold" flag
    return [1 - v for v in raw]  # 1 = exit, 0 = hold


def _select_exit(price: float, bar_high: float, bar_low: float, *,
                 sl_level: Optional[float], atr_sl_level: Optional[float],
                 trail_level: Optional[float], tp_level: Optional[float],
                 exit_signal_now: bool):
    """Gap-aware exit selection — the single source of truth shared by the
    live tick (`_run_account_tick_impl`) and the optimizer backtest
    (`autotrade_sim._simulate_symbol`), so both price stops/targets identically
    and can never drift apart.

    Loss-side has priority: if both a stop and the TP would have triggered on
    the same gap day, we assume the worse-case stop fill. Fill model:
      - threshold inside [bar_low, bar_high] → fill exactly at the threshold
        (limit/stop-order semantics)
      - bar gapped entirely through the threshold → fill at the worse extreme
        (bar_low for a stop). TP never fills better than its level (we don't
        model favorable gap-ups, which would overstate P&L).

    Pass a level as None to disable it. `exit_signal_now` is the pre-computed
    soft-exit decision (exit_signals[i]==1 or a 1→0 signal cross). Returns
    (exit_reason, exit_price); exit_reason is None when nothing triggers.
    """
    if sl_level is not None and bar_low <= sl_level:
        return 'SL', (sl_level if bar_high >= sl_level else bar_low)
    if atr_sl_level is not None and bar_low <= atr_sl_level:
        return 'ATR_SL', (atr_sl_level if bar_high >= atr_sl_level else bar_low)
    if trail_level is not None and bar_low <= trail_level:
        return 'TRAIL_SL', (trail_level if bar_high >= trail_level else bar_low)
    if tp_level is not None and bar_high >= tp_level:
        return 'TP', tp_level
    if exit_signal_now:
        return 'signal', price
    return None, price


_DB = Path(__file__).resolve().parents[1] / 'trading_agents.db'
_PROD_DB_PATH = Path(__file__).resolve().parents[1] / 'trading_agents.db'
# T7-bugfix: when _DB has been monkeypatched away from the prod path (e.g.
# during tests), don't fire OUTBOUND notifications — those go through
# notify.py which reads the REAL trading_agents.db unconditionally and
# would email the real user. Belt-and-braces with PAPER_TRADING_MUTE_NOTIFY=1.
def _notifications_safe() -> bool:
    if os.environ.get('PAPER_TRADING_MUTE_NOTIFY') == '1':
        return False
    try:
        return Path(_DB).resolve() == _PROD_DB_PATH.resolve()
    except Exception:
        return True

# Legacy fallback. New code should call _fee_bps(symbol, side) instead.
# Kept for back-compat with any external callers that imported FEE_BPS.
FEE_BPS = 5.0 / 10000.0

# Per-venue fee model. Audit finding: the old flat 5 bps overstated US P&L
# (real retail = ~1 bp) and understated HK by ~8 bps per round-trip
# (commission + 0.1% stamp duty on sell side). Treating both at 5 bps
# inflated HK backtest returns by ~1.6% per round-trip.
#
# Each entry = (buy_bps, sell_bps). Add new venues here as needed.
_FEE_TABLE = {
    'US':     (1.0 / 10000.0, 1.0 / 10000.0),    # 1 bp each side
    'HK':     (3.0 / 10000.0, 13.0 / 10000.0),   # comm + stamp + slippage
    # E3 — A-shares: ~2.5 bp commission per side; sell adds the 0.05% stamp
    # duty (halved 2023-08-28 — do NOT "fix" this back to 0.1%). Without
    # this entry .SS/.SZ fell to DEFAULT and CN backtests were fiction:
    # recent A-share ML studies find total costs eat ~30% of gross return.
    'CN':     (2.5 / 10000.0, 7.5 / 10000.0),
    'CRYPTO': (25.0 / 10000.0, 25.0 / 10000.0),  # 25 bp ≈ Binance/Coinbase taker
    'DEFAULT':(5.0 / 10000.0, 5.0 / 10000.0),
}


def _venue_for(symbol: str) -> str:
    s = (symbol or '').upper()
    if s.endswith('.HK'):
        return 'HK'
    if s.endswith('.SS') or s.endswith('.SZ'):
        return 'CN'
    if s.endswith('-USD'):
        # Crypto: typical retail-broker maker/taker = 25-50 bp each side.
        return 'CRYPTO'
    return 'US'


def _fee_bps(symbol: str, side: str) -> float:
    """Fee in bps (decimal, e.g. 0.0005 = 5 bps) for the given symbol/side."""
    venue = _venue_for(symbol)
    buy_bps, sell_bps = _FEE_TABLE.get(venue, _FEE_TABLE['DEFAULT'])
    return buy_bps if side == 'buy' else sell_bps


# T15 spread tiers — half-spread paid on entry + exit on TOP of fees.
# Mega-cap = SPY/AAPL/MSFT class; mid-cap = $5-50B; small-cap = <$5B.
# Source: empirical median spread on NMS/NASDAQ at 10:00-15:00 ET 2025.
# Cheap-to-trade names live in MEGA bucket; the long tail in SMALL.
_SPREAD_BPS = {
    'MEGA':  0.5,   # 0.5 bp = 0.005% of mid (half-spread)
    'LARGE': 1.5,
    'MID':   4.0,
    'SMALL': 12.0,
    'MICRO': 30.0,
}

# Curated tier list. Anything not listed falls back to MID (a conservative
# guess for unknown names).
_SPREAD_TIER_MEGA = {
    'SPY', 'QQQ', 'IWM', 'DIA', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL',
    'GOOG', 'META', 'TSLA', 'BRK.B', 'AVGO', 'TSM', 'COST', 'WMT', 'JPM',
}
_SPREAD_TIER_LARGE = {
    'AMD', 'NFLX', 'CRM', 'ORCL', 'BAC', 'XOM', 'CVX', 'JNJ', 'UNH',
    'LLY', 'PG', 'HD', 'V', 'MA', 'PEP', 'KO', 'DIS', 'INTC', 'CSCO',
    'ABBV', 'PFE', 'MRK', 'TMO', 'ABT', 'AMAT', 'LRCX', 'ADBE', 'NOW',
}


def _spread_tier(symbol: str) -> str:
    s = (symbol or '').upper()
    if s in _SPREAD_TIER_MEGA:
        return 'MEGA'
    if s in _SPREAD_TIER_LARGE:
        return 'LARGE'
    if s.endswith('-USD'):
        # Crypto spreads on retail venues: BTC/ETH ~5 bp, mid-caps ~15 bp.
        return 'LARGE' if s in ('BTC-USD', 'ETH-USD') else 'MID'
    if s.endswith('.HK'):
        return 'MID'
    return 'MID'


def _half_spread_bps(symbol: str) -> float:
    """Half-spread in DECIMAL (e.g. 0.0001 = 1 bp). Applied per side on
    top of fees in the entry/exit cost model."""
    tier = _spread_tier(symbol)
    return _SPREAD_BPS.get(tier, _SPREAD_BPS['MID']) / 10000.0


def _slippage_bps(symbol: str, order_dollars: float,
                  adv_dollars: float = 0.0) -> float:
    """Volume-aware slippage in decimal. Quadratic above 1% of ADV — large
    orders eat increasingly more of the book.

    ``adv_dollars`` is dollar-volume average. When unknown (0), we assume a
    conservative $50M ADV — corresponds to median liquid US mid-cap.
    """
    adv = adv_dollars if adv_dollars > 0 else 50_000_000.0
    if order_dollars <= 0 or adv <= 0:
        return 0.0
    ratio = order_dollars / adv
    if ratio <= 0.01:
        return 0.0
    # k × (ratio − 0.01)² in bps, scaled so 5% of ADV ≈ 8 bp impact.
    impact_bp = 35.0 * (ratio - 0.01) ** 2
    return impact_bp / 10000.0


def total_transaction_cost_bps(symbol: str, side: str, order_dollars: float,
                                adv_dollars: float = 0.0) -> float:
    """All-in transaction cost = fee + half-spread + size slippage. Decimal
    (e.g. 0.0008 = 8 bps). Used as a multiplier on trade_value when
    computing total cash effect."""
    return (_fee_bps(symbol, side)
            + _half_spread_bps(symbol)
            + _slippage_bps(symbol, order_dollars, adv_dollars))


# Anti-churn cooldown: minimum bars between a sell and a re-entry on the
# same symbol. Default 1 = "no same-day re-entry on the bar you just sold,
# at minimum sleep one bar before re-entering". Verified necessary by the
# Track-1 smoke test which showed XOM/TEAM bought→sold→bought on the same
# day under combine_mode='any' + majority exit.
_DEFAULT_HOLD_COOLDOWN_DAYS = 1
# Floor on realized vol used by vol-target sizing — without this an
# ultra-low-vol stock would get the max-per-name cap regardless of signal
# quality (audit finding #10). 5% annualized is a sane floor for any
# normal equity; below that the denominator is dominated by noise/halt.
_VOL_TARGET_SIGMA_FLOOR = 0.05
# Min trade value (account-currency) — prevents the engine from placing
# odd-lot $5 orders when the strategy allocates a sliver of cash.
_DEFAULT_MIN_TRADE_VALUE = 100.0

# T11 Kelly sizing knobs.
# Sample-size floor: below this many closed positions per strategy, the
# Kelly fraction is too noisy to trust — we fall back to vol-target or
# fixed sizing. Empirically 20 trades gives ~±15% std error on win rate.
_KELLY_MIN_SAMPLES = 20
# Safety multiplier on raw Kelly. Full Kelly (1.0) is theoretically optimal
# for log-wealth but has brutal drawdowns from estimation error; 0.25
# ("quarter Kelly") is the retail standard.
_KELLY_DEFAULT_SAFETY = 0.25
# Hard caps so Kelly can't go past sane bounds even on a hot streak.
_KELLY_HARD_FLOOR = 0.01
_KELLY_HARD_CEIL = 0.50


def _sigma_for_sizing(symbol: str, closes_so_far: List[float],
                      plan: Dict[str, Any]) -> float:
    """T18A — vol estimate consumed by vol-target sizing.

    Uses GARCH(1,1) forecast when ``plan.use_garch=True`` AND a cached model
    exists; falls back to ``_realized_vol_annual(closes, 30)`` otherwise.
    Always floored at _VOL_TARGET_SIGMA_FLOOR.
    """
    use_garch = bool(plan.get('use_garch', True))
    sigma: Optional[float] = None
    if use_garch:
        try:
            try:
                from .garch import forecast_vol  # type: ignore
            except ImportError:
                from web.modules.garch import forecast_vol  # type: ignore
            sigma = forecast_vol(symbol, horizon=5, auto_fit=False)
        except Exception:
            sigma = None
    if sigma is None or sigma <= 0:
        sigma = _realized_vol_annual(closes_so_far, 30)
    return max(sigma, _VOL_TARGET_SIGMA_FLOOR)


def _vwap_distance_pct(closes: List[float], highs: List[float], lows: List[float],
                       window: int = 20) -> Optional[float]:
    """Distance of today's close from the rolling typical-price VWAP, as a
    percentage. Positive = above VWAP (chasing risk), negative = below.

    We use a volume-naive VWAP — equal-weighted typical price = (H+L+C)/3 —
    because the OHLCV feed used here doesn't carry per-bar volume reliably.
    Empirically the distance signal correlates ~0.85 with true VWAP for
    liquid US equities, which is good enough as a "don't chase" gate.
    """
    n = len(closes)
    if n < window or n != len(highs) or n != len(lows):
        return None
    typ = [(highs[i] + lows[i] + closes[i]) / 3.0
           for i in range(n - window, n)]
    vwap = sum(typ) / window if window else 0
    if vwap <= 0:
        return None
    return (closes[-1] - vwap) / vwap * 100.0


def _kelly_fraction(wins: int, losses: int,
                    avg_win_pct: float, avg_loss_pct: float,
                    safety: float = _KELLY_DEFAULT_SAFETY) -> Optional[float]:
    """Compute the safety-adjusted Kelly fraction for a given (wins, losses,
    avg_win%, avg_loss%) record. Returns None when there's insufficient data
    to size safely (caller should fall back to vol_target or fixed).

    Formula:  f* = (p*b − (1−p)) / b
    where p = win rate, b = avg_win / avg_loss (payoff ratio).
    """
    total = wins + losses
    if total < _KELLY_MIN_SAMPLES:
        return None
    if avg_loss_pct <= 0 or avg_win_pct <= 0:
        return None
    p = wins / total
    b = avg_win_pct / avg_loss_pct
    raw = (p * b - (1.0 - p)) / b
    if raw <= 0:
        # Negative-edge strategies get effectively-zero allocation, not Kelly.
        return _KELLY_HARD_FLOOR
    return max(_KELLY_HARD_FLOOR, min(_KELLY_HARD_CEIL, raw * safety))


# --------------------------------------------------------------------------
# P7 — correlation-aware sizing. Kelly / vol-target size each name in
# isolation, so a book of N highly-correlated names quietly carries ~N× the
# intended risk. Before opening a new position we measure the candidate's
# return correlation against what the account already holds and shrink the
# slice when it adds the same bet again. Sizing-only (never blocks an entry)
# and computed from the series the tick already fetched — zero extra I/O.
# --------------------------------------------------------------------------
_CORR_WINDOW = 60          # trailing daily returns used per pair
_CORR_MIN_POINTS = 20      # below this the pair is "no information"
_CORR_FREE_THRESHOLD = 0.3 # correlation below this costs nothing
_CORR_SLOPE = 0.8          # mult = 1 − slope·(avg_corr − threshold)
_CORR_MIN_MULT = 0.5       # never cut a slice below half


def _pearson(a: List[float], b: List[float]) -> Optional[float]:
    n = len(a)
    if n < 3 or n != len(b):
        return None
    ma = sum(a) / n
    mb = sum(b) / n
    cov = sum((a[i] - ma) * (b[i] - mb) for i in range(n))
    va = sum((x - ma) ** 2 for x in a)
    vb = sum((x - mb) ** 2 for x in b)
    if va <= 1e-18 or vb <= 1e-18:
        return None  # flat series carries no correlation information
    return cov / ((va ** 0.5) * (vb ** 0.5))


def _corr_sizing_multiplier(series: Dict[str, Dict[str, Any]], cand_sym: str,
                            held_syms: List[str], asof_date: str) -> float:
    """Multiplier in [_CORR_MIN_MULT, 1.0] for the candidate's entry size,
    from its average trailing-return correlation with held names. Returns
    are aligned on COMMON dates (HK/US holiday mismatches would otherwise
    fabricate decorrelation). Degrades to 1.0 whenever there's no usable
    information — this must never be the reason an account can't trade."""
    cand = series.get(cand_sym)
    if not cand or not held_syms:
        return 1.0
    cand_idx = cand['idx_by_date']
    corrs: List[float] = []
    for hs in held_syms:
        if hs == cand_sym:
            continue
        held = series.get(hs)
        if not held:
            continue
        common = [d for d in held['dates']
                  if d <= asof_date and d in cand_idx]
        if len(common) < _CORR_MIN_POINTS + 1:
            continue
        common = common[-(_CORR_WINDOW + 1):]
        held_idx = held['idx_by_date']
        rc, rh = [], []
        for j in range(1, len(common)):
            c0 = float(cand['closes'][cand_idx[common[j - 1]]])
            c1 = float(cand['closes'][cand_idx[common[j]]])
            h0 = float(held['closes'][held_idx[common[j - 1]]])
            h1 = float(held['closes'][held_idx[common[j]]])
            if c0 <= 0 or h0 <= 0:
                continue
            rc.append(c1 / c0 - 1.0)
            rh.append(h1 / h0 - 1.0)
        r = _pearson(rc, rh)
        if r is not None:
            corrs.append(r)
    if not corrs:
        return 1.0
    avg = sum(corrs) / len(corrs)
    mult = 1.0 - _CORR_SLOPE * max(0.0, avg - _CORR_FREE_THRESHOLD)
    return max(_CORR_MIN_MULT, min(1.0, mult))


# ---------------------------------------------------------------------------
# Per-account advisory lock + atomic claim/release.
# We use a column on paper_accounts ("tick_running") rather than a separate
# lock table because the existing tick already SELECTs the account row, and
# co-locating the lock means a single UPDATE wins the race or doesn't.
#
# Stuck-lock recovery: if `tick_running` is older than _TICK_STALE_SECS, we
# steal it on the next claim and log a warning — without this, a crashed
# tick (e.g. yfinance hang killed by OS) would permanently lock the account.
# ---------------------------------------------------------------------------
_TICK_STALE_SECS = 30 * 60   # 30 minutes — longer than any real tick should take


def _claim_tick(account_id: int) -> bool:
    """Atomic 0→1 claim of the per-account tick lock. Returns True on win.

    SQLite serializes writes, so the UPDATE-WHERE-tick_running-IS-NULL race
    is safe: exactly one of N concurrent callers gets rowcount=1.
    """
    now_iso = datetime.now().isoformat()
    stale_cutoff = (datetime.now() - timedelta(seconds=_TICK_STALE_SECS)).isoformat()
    with sqlite3.connect(str(_DB), timeout=10.0) as c:
        c.execute('BEGIN IMMEDIATE')
        cur = c.execute(
            'UPDATE paper_accounts SET tick_running=? '
            'WHERE id=? AND (tick_running IS NULL OR tick_running < ?)',
            (now_iso, account_id, stale_cutoff),
        )
        c.commit()
        won = cur.rowcount > 0
    if won:
        _log(account_id, 'info', 'tick lock acquired')
    return won


def _release_tick(account_id: int, error: Optional[str] = None) -> None:
    try:
        with sqlite3.connect(str(_DB), timeout=10.0) as c:
            c.execute(
                'UPDATE paper_accounts SET tick_running=NULL, last_tick_error=? WHERE id=?',
                (error, account_id),
            )
            c.commit()
    except Exception as e:
        _log(account_id, 'error', f'failed to release tick lock: {e}')


def _record_admin_action(account_id: int, user_id: Optional[int],
                         action: str, details: Optional[Dict[str, Any]] = None) -> None:
    """Append-only audit row. Best-effort — never raise."""
    try:
        init_paper_tables()
        with _conn() as c:
            c.execute(
                'INSERT INTO paper_admin_actions (account_id, user_id, action, details_json) '
                'VALUES (?, ?, ?, ?)',
                (account_id, user_id, action, json.dumps(details or {})),
            )
            c.commit()
    except Exception as e:
        _log(account_id, 'warning', f'admin audit write failed for action={action}: {e}')


# ---------------------------------------------------------------------------
# Symbol health tracking (Track 3)
#
# Previously: when yfinance returned no data for a symbol, _signals_for
# returned None and the symbol just vanished from the day's universe. No
# log, no record, no alert. Users would see "AAPL stopped trading" with
# zero diagnostic trail.
#
# Now: every fetch attempt updates paper_symbol_health. A symbol that
# fails _SYMBOL_DISABLE_THRESHOLD consecutive times is auto-blacklisted
# for the user (until they re-enable it manually).
# ---------------------------------------------------------------------------
_SYMBOL_DISABLE_THRESHOLD = 5


def _record_symbol_success(symbol: str) -> None:
    """Mark a symbol fetch as successful — resets consecutive_failures."""
    if not symbol:
        return
    try:
        with _conn() as c:
            c.execute('''INSERT INTO paper_symbol_health
                         (symbol, last_success_at, total_successes, consecutive_failures)
                         VALUES (?, CURRENT_TIMESTAMP, 1, 0)
                         ON CONFLICT(symbol) DO UPDATE SET
                            last_success_at=CURRENT_TIMESTAMP,
                            total_successes = total_successes + 1,
                            consecutive_failures = 0''',
                      (symbol,))
            c.commit()
    except Exception as e:
        _log(None, 'warning', f'symbol_health success write failed for {symbol}: {e}')


def _record_symbol_failure(symbol: str, reason: str = '') -> int:
    """Mark a symbol fetch as failed. Returns the new consecutive_failures
    count so the caller can decide whether to disable the symbol."""
    if not symbol:
        return 0
    try:
        with _conn() as c:
            c.execute('''INSERT INTO paper_symbol_health
                         (symbol, last_failure_at, last_failure_reason,
                          total_failures, consecutive_failures)
                         VALUES (?, CURRENT_TIMESTAMP, ?, 1, 1)
                         ON CONFLICT(symbol) DO UPDATE SET
                            last_failure_at=CURRENT_TIMESTAMP,
                            last_failure_reason=excluded.last_failure_reason,
                            total_failures = total_failures + 1,
                            consecutive_failures = consecutive_failures + 1''',
                      (symbol, reason[:200]))
            c.commit()
            row = c.execute(
                'SELECT consecutive_failures FROM paper_symbol_health WHERE symbol=?',
                (symbol,)).fetchone()
            return int(row['consecutive_failures']) if row else 0
    except Exception as e:
        _log(None, 'warning', f'symbol_health failure write failed for {symbol}: {e}')
        return 0


def get_symbol_health(symbol: Optional[str] = None,
                      unhealthy_only: bool = False,
                      limit: int = 100) -> Dict[str, Any]:
    """Read symbol-health rows. Used by /api/paper/health and dashboards.

    - symbol=None: return up to `limit` rows
    - unhealthy_only=True: only rows with consecutive_failures > 0
    """
    init_paper_tables()
    with _conn() as c:
        if symbol:
            row = c.execute(
                'SELECT * FROM paper_symbol_health WHERE symbol=?', (symbol,)).fetchone()
            return {'success': True, 'symbol': symbol, 'row': dict(row) if row else None}
        where = 'WHERE consecutive_failures > 0' if unhealthy_only else ''
        rows = c.execute(
            f'SELECT * FROM paper_symbol_health {where} '
            'ORDER BY consecutive_failures DESC, last_failure_at DESC LIMIT ?',
            (int(limit),)).fetchall()
        return {'success': True, 'rows': [dict(r) for r in rows]}


# ---------------------------------------------------------------------------
# Halt / gap detector (Track 3)
#
# A delisted stock that re-lists, or a long trading halt, leaves a gap in
# the OHLCV date array. The MA/RSI/MACD indicators happily mix bars from
# either side of the gap as if they were contiguous → spurious crossovers
# fire immediately on re-listing, producing fake BUY signals.
#
# detect_gaps(dates) returns the (index, gap_days) pairs where the gap
# between consecutive trading bars exceeds _GAP_THRESHOLD_DAYS. Callers
# log + decide whether to defer trading the symbol.
# ---------------------------------------------------------------------------
_GAP_THRESHOLD_DAYS = 14   # weekends + holiday = 4-5 days max; > 14 = real halt


def detect_gaps(dates: List[str]) -> List[Tuple[int, int]]:
    """Return list of (right_index, gap_days) where dates[i] - dates[i-1] > threshold."""
    out: List[Tuple[int, int]] = []
    if not dates:
        return out
    prev: Optional[date] = None
    for i, d in enumerate(dates):
        try:
            cur = date.fromisoformat(d)
        except Exception:
            continue
        if prev is not None:
            gap = (cur - prev).days
            if gap > _GAP_THRESHOLD_DAYS:
                out.append((i, gap))
        prev = cur
    return out


def _validate_hk_lot(symbol: str) -> None:
    """Log a warning when an HK symbol falls back to the default lot=100
    because we don't have its true HKEX board-lot size in _HK_LOT_SIZES.
    Audit finding: a wrong lot size can over-size an HK position by 10x."""
    s = (symbol or '').upper()
    if not s.endswith('.HK'):
        return
    if s not in _HK_LOT_SIZES:
        _log(None, 'warning',
             f'HK lot fallback used for {s}=100; verify true board-lot before live trading')


# ---------------------------------------------------------------------------
# Sector concentration cap (Audit finding #11)
#
# Without sector controls, an account can hold 5 HK banks all firing the
# same MACD on the same day — 100% financials, zero diversification. Now
# the entry loop computes the open-position MTM per sector and rejects
# new entries that would breach `max_per_sector_pct`.
#
# Sector data: yfinance.info['sector'] is the source of truth but slow
# (HTTP per symbol). We cache lazily to paper_symbol_meta with a 30-day
# TTL; a small inline fallback covers the most common HK/US tickers so
# the test suite and offline runs don't depend on the network.
# ---------------------------------------------------------------------------
_SECTOR_TTL_DAYS = 30
_SECTOR_INLINE_FALLBACK: Dict[str, str] = {
    # US mega-caps — most likely to appear in account universes
    'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology',
    'GOOG': 'Technology', 'META': 'Technology', 'NVDA': 'Technology',
    'AMZN': 'Consumer Cyclical', 'TSLA': 'Consumer Cyclical',
    'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy',
    'JPM': 'Financial Services', 'BAC': 'Financial Services',
    'WFC': 'Financial Services', 'GS': 'Financial Services',
    'V': 'Financial Services', 'MA': 'Financial Services',
    'WMT': 'Consumer Defensive', 'PG': 'Consumer Defensive',
    'KO': 'Consumer Defensive', 'PEP': 'Consumer Defensive',
    'JNJ': 'Healthcare', 'LLY': 'Healthcare', 'PFE': 'Healthcare',
    'UNH': 'Healthcare', 'MRK': 'Healthcare',
    'TEAM': 'Technology', 'CRM': 'Technology', 'NFLX': 'Communication',
    'SPY': 'ETF', 'QQQ': 'ETF', 'IWM': 'ETF',
    # HK majors
    '0005.HK': 'Financial Services',   # HSBC
    '2318.HK': 'Financial Services',   # Ping An
    '2388.HK': 'Financial Services',   # BOC Hong Kong
    '1398.HK': 'Financial Services',   # ICBC
    '3988.HK': 'Financial Services',   # Bank of China
    '0388.HK': 'Financial Services',   # HKEX
    '0939.HK': 'Financial Services',   # CCB
    '2628.HK': 'Financial Services',   # China Life
    '0700.HK': 'Technology',           # Tencent
    '9988.HK': 'Consumer Cyclical',    # Alibaba-SW
    '1810.HK': 'Technology',           # Xiaomi
    '3690.HK': 'Consumer Cyclical',    # Meituan
    '9618.HK': 'Consumer Cyclical',    # JD-SW
    '0883.HK': 'Energy',               # CNOOC
    '0857.HK': 'Energy',               # PetroChina
    '0386.HK': 'Energy',               # Sinopec
    '0001.HK': 'Industrials',          # CK Hutchison
    '0011.HK': 'Financial Services',   # Hang Seng Bank
    '0016.HK': 'Real Estate',          # SHK Properties
    '0017.HK': 'Real Estate',          # New World
}


def _symbol_sector(symbol: str, allow_network: bool = True) -> Optional[str]:
    """Return the sector for a symbol, or None when unknown.

    Lookup priority:
      1. paper_symbol_meta cache (fresh within _SECTOR_TTL_DAYS)
      2. _SECTOR_INLINE_FALLBACK static table (offline-safe)
      3. yfinance.info['sector'] (when allow_network=True); cached on success
    """
    if not symbol:
        return None
    sym = symbol.upper()
    try:
        with _conn() as c:
            row = c.execute(
                'SELECT sector, fetched_at FROM paper_symbol_meta WHERE symbol=?',
                (sym,)).fetchone()
        if row and row['sector']:
            try:
                age_days = (datetime.now() - datetime.fromisoformat(row['fetched_at'])).days
                if age_days <= _SECTOR_TTL_DAYS:
                    return row['sector']
            except Exception:
                return row['sector']
    except Exception:
        pass

    inline = _SECTOR_INLINE_FALLBACK.get(sym)
    if inline:
        # Persist the inline value so subsequent reads skip the dict lookup
        _store_symbol_sector(sym, inline, source='inline')
        return inline

    if not allow_network:
        return None
    sector: Optional[str] = None
    try:
        import yfinance as yf
        info = yf.Ticker(sym).info
        sector = (info.get('sector') or '').strip() or None
    except Exception as e:
        _log(None, 'warning', f'yfinance sector lookup failed for {sym}: {e}')
    if sector:
        _store_symbol_sector(sym, sector, source='yfinance')
    return sector


def _store_symbol_sector(symbol: str, sector: str, source: str = '') -> None:
    try:
        with _conn() as c:
            c.execute('''INSERT INTO paper_symbol_meta (symbol, sector, fetched_at)
                         VALUES (?, ?, CURRENT_TIMESTAMP)
                         ON CONFLICT(symbol) DO UPDATE SET
                            sector=excluded.sector,
                            fetched_at=CURRENT_TIMESTAMP''',
                      (symbol.upper(), sector))
            c.commit()
    except Exception as e:
        _log(None, 'warning', f'symbol_meta write failed for {symbol}: {e}')


def _conn():
    c = sqlite3.connect(str(_DB), timeout=5.0)
    c.row_factory = sqlite3.Row
    # T7.2: WAL + NORMAL sync set once per connection (PRAGMAs are
    # connection-scoped on the journal-mode side and process-scoped for
    # the file format — applying every time is cheap and idempotent).
    try:
        from .observability import apply_pragmas
    except Exception:
        try:
            from web.modules.observability import apply_pragmas  # type: ignore
        except Exception:
            apply_pragmas = None  # type: ignore
    if apply_pragmas:
        apply_pragmas(c)
    return c


# ---------------------------------------------------------------------------
# Currency helpers — let mixed US+HK accounts settle in one currency (HKD).
# Prices fetched from yfinance arrive in the listing currency (USD for US tickers,
# HKD for .HK), so we convert to the account's base currency before any
# storage or P&L math.
# ---------------------------------------------------------------------------
_FX_CACHE: Dict[str, tuple] = {}
_FX_LOCK = threading.Lock()       # Track 3: thread-safe read-modify-write of cache
_FX_TTL = 12 * 3600  # 12 hours
# Per-key meta tracking — was the last value a real feed or a fallback?
# Format: {pair: {'source': 'feed' | 'fallback_peg' | 'fallback_one', 'fetched_at': ts}}
_FX_META: Dict[str, Dict[str, Any]] = {}
# Tick-scoped stale-FX accumulator. Each call to _fx_rate() pushes the
# (from, to, source) tuple here when source != 'feed'. _run_account_tick_impl
# reads + clears at end of tick so the per-tick log/alert can mention what
# rates were synthetic for this account's positions.
_FX_STALE_TLS = threading.local()


def _symbol_currency(symbol: str) -> str:
    """Best-effort currency for a yfinance symbol based on its suffix."""
    s = (symbol or '').upper()
    if s.endswith('.HK'):
        return 'HKD'
    if s.endswith('.SS') or s.endswith('.SZ'):
        return 'CNY'
    if s.endswith('.T'):
        return 'JPY'
    if s.endswith('.L'):
        return 'GBP'
    return 'USD'


def _push_fx_stale(pair: str, source: str) -> None:
    """Record that this tick used a synthetic/fallback FX rate so the tick
    summary can flag the account as having FX-staleness risk."""
    bucket = getattr(_FX_STALE_TLS, 'pairs', None)
    if bucket is None:
        bucket = []
        _FX_STALE_TLS.pairs = bucket
    bucket.append((pair, source))


def _drain_fx_stale() -> List[Tuple[str, str]]:
    bucket = getattr(_FX_STALE_TLS, 'pairs', None) or []
    _FX_STALE_TLS.pairs = []
    return bucket


def _fx_rate(from_ccy: str, to_ccy: str) -> float:
    """Return the multiplier turning 1 unit of from_ccy into to_ccy.

    Uses yfinance '<FROM><TO>=X' (e.g. USDHKD=X). Cached 12h under a lock so
    concurrent ticks don't half-write the cache entry. On failure, falls
    back to a hardcoded peg (and records source='fallback_peg' so the tick
    log/email can warn the user — the audit found these fallbacks were
    silent ±3% mispricing risks).
    """
    f, t = from_ccy.upper(), to_ccy.upper()
    if f == t:
        return 1.0
    key = f'{f}{t}'
    with _FX_LOCK:
        cached = _FX_CACHE.get(key)
        if cached and time.time() - cached[0] < _FX_TTL:
            meta = _FX_META.get(key, {})
            if meta.get('source') and meta['source'] != 'feed':
                _push_fx_stale(key, meta['source'])
            return cached[1]
    rate: Optional[float] = None
    source = 'feed'
    try:
        import yfinance as yf
        h = yf.Ticker(f'{f}{t}=X').history(period='5d', interval='1d')
        if h is not None and not h.empty:
            v = float(h['Close'].dropna().iloc[-1])
            if v > 0:
                rate = v
    except Exception:
        rate = None
    if rate is None:
        try:
            import yfinance as yf
            h = yf.Ticker(f'{t}{f}=X').history(period='5d', interval='1d')
            if h is not None and not h.empty:
                v = float(h['Close'].dropna().iloc[-1])
                if v > 0:
                    rate = 1.0 / v
        except Exception:
            rate = None
    if rate is None:
        if (f, t) == ('USD', 'HKD'):
            rate = 7.80
            source = 'fallback_peg'
            _log(None, 'warning',
                 f"FX fallback used: {key}={rate} (feed unavailable, positions ±3% off)")
        elif (f, t) == ('HKD', 'USD'):
            rate = 1.0 / 7.80
            source = 'fallback_peg'
            _log(None, 'warning',
                 f"FX fallback used: {key}={rate:.5f} (feed unavailable)")
        else:
            rate = 1.0
            source = 'fallback_one'
            _log(None, 'error',
                 f"FX fallback to 1.0: no rate for {key} — mixed-currency positions WILL BE WRONG")
        _push_fx_stale(key, source)
    with _FX_LOCK:
        _FX_CACHE[key] = (time.time(), rate)
        _FX_META[key] = {'source': source, 'fetched_at': time.time()}
    return rate


def _convert_series(values: List[float], from_ccy: str, to_ccy: str) -> List[float]:
    """Multiply every value by the FX rate from→to. Returns a new list.

    Note: we use the latest spot rate as a single multiplier across all bars.
    For paper-trading purposes this is good enough — TA signals (MA, RSI,
    momentum, breakouts) are scale-invariant under positive multiplication, so
    using one rate doesn't change which days are buys/sells.
    """
    if from_ccy == to_ccy or not values:
        return list(values)
    r = _fx_rate(from_ccy, to_ccy)
    return [v * r for v in values]


# ---------------------------------------------------------------------------
# HK board-lot sizes — required for realistic HK simulation. HKEX listings
# trade in fixed lot multiples; you cannot buy 13 shares of 0700.HK.
# Source: HKEX securities lot table (verified 2026 majors). Unknown HK
# tickers default to 100 (the most common lot at HKEX).
# ---------------------------------------------------------------------------
_HK_LOT_SIZES: Dict[str, int] = {
    '0001.HK': 500,    # CK Hutchison
    '0002.HK': 500,    # CLP
    '0003.HK': 1000,   # HK & China Gas
    '0005.HK': 400,    # HSBC
    '0006.HK': 500,    # Power Assets
    '0011.HK': 100,    # Hang Seng Bank
    '0012.HK': 1000,   # Henderson Land
    '0016.HK': 500,    # Sun Hung Kai
    '0017.HK': 1000,   # New World
    '0027.HK': 400,    # Galaxy Entertainment
    '0066.HK': 500,    # MTR
    '0288.HK': 1000,   # WH Group
    '0386.HK': 2000,   # Sinopec
    '0388.HK': 100,    # HKEX
    '0669.HK': 1000,   # Techtronic
    '0700.HK': 100,    # Tencent
    '0857.HK': 2000,   # PetroChina
    '0883.HK': 1000,   # CNOOC
    '0939.HK': 1000,   # CCB
    '0941.HK': 500,    # China Mobile
    '0960.HK': 500,    # Longfor
    '0968.HK': 2000,   # Xinyi Solar
    '1024.HK': 100,    # Kuaishou
    '1109.HK': 2000,   # China Resources Land
    '1299.HK': 200,    # AIA
    '1398.HK': 1000,   # ICBC
    '1810.HK': 1000,   # Xiaomi
    '2318.HK': 500,    # Ping An
    '2388.HK': 500,    # BOC Hong Kong
    '2628.HK': 1000,   # China Life
    '3690.HK': 100,    # Meituan
    '3988.HK': 1000,   # Bank of China
    '9618.HK': 50,     # JD-SW
    '9988.HK': 100,    # Alibaba-SW
}


_MTF_CACHE: Dict[str, tuple] = {}
_MTF_LOCK = threading.Lock()
_MTF_TTL = 12 * 3600  # weekly bar refresh OK at 12h cadence


def _weekly_trend_up(symbol: str) -> Optional[bool]:
    """True if the weekly EMA(20) > EMA(50) on the symbol's weekly chart.

    Pro filter: don't open new longs against the higher-timeframe trend.
    Returns None if data is missing — caller treats None as "don't gate".
    """
    key = f'wkemas:{symbol}'
    with _MTF_LOCK:
        cached = _MTF_CACHE.get(key)
        if cached and time.time() - cached[0] < _MTF_TTL:
            return cached[1]
    result: Optional[bool] = None
    try:
        import yfinance as yf
        h = yf.Ticker(symbol).history(period='2y', interval='1wk')
        if h is not None and not h.empty:
            closes = list(h['Close'].dropna().values)
            if len(closes) >= 55:
                def _ema(values, n):
                    k = 2 / (n + 1)
                    out = [values[0]]
                    for v in values[1:]:
                        out.append(v * k + out[-1] * (1 - k))
                    return out
                e20 = _ema(closes, 20)
                e50 = _ema(closes, 50)
                result = bool(e20[-1] > e50[-1])
    except Exception:
        result = None
    with _MTF_LOCK:
        _MTF_CACHE[key] = (time.time(), result)
    return result


def _realized_vol_annual(closes: List[float], n: int = 30) -> float:
    """Annualized realized vol from the most recent ``n`` daily closes.

    Used by vol-target position sizing: bigger positions in low-vol names,
    smaller in high-vol names so each holding contributes a similar amount
    of risk.
    """
    if len(closes) < n + 1:
        return 0.0
    import math as _m
    rets = []
    for i in range(len(closes) - n, len(closes)):
        if i <= 0:
            continue
        prev, cur = closes[i - 1], closes[i]
        if prev > 0 and cur > 0:
            rets.append(_m.log(cur / prev))
    if len(rets) < 5:
        return 0.0
    mu = sum(rets) / len(rets)
    var = sum((r - mu) ** 2 for r in rets) / max(1, len(rets) - 1)
    return _m.sqrt(var * 252)


def _atr(highs: List[float], lows: List[float], closes: List[float], n: int = 14) -> float:
    """True-range based volatility (used for ATR stops)."""
    if len(closes) < n + 1:
        return 0.0
    trs = []
    for i in range(1, len(closes)):
        tr = max(highs[i] - lows[i],
                 abs(highs[i] - closes[i - 1]),
                 abs(lows[i] - closes[i - 1]))
        trs.append(tr)
    if len(trs) < n:
        return 0.0
    return sum(trs[-n:]) / n


def _vix_latest() -> Optional[float]:
    """Latest CBOE VIX close. Cached 1h. Returns None if fetch fails."""
    key = 'vix:latest'
    cached = _FX_CACHE.get(key)
    if cached and time.time() - cached[0] < 3600:
        return cached[1]
    try:
        import yfinance as yf
        h = yf.Ticker('^VIX').history(period='5d', interval='1d')
        if h is None or h.empty:
            return None
        v = float(h['Close'].dropna().iloc[-1])
    except Exception:
        v = None
    _FX_CACHE[key] = (time.time(), v)
    return v


def _lot_size(symbol: str) -> int:
    """Return the share-multiple for a tradable lot.

    HK shares must be bought in board-lot multiples (e.g. 0700.HK trades in
    100-share lots, 1810.HK in 1000-share lots). yfinance won't enforce this
    — we round share counts down to the nearest lot before recording trades.
    Unknown HK tickers default to 100. US tickers (and others) return 1.
    """
    s = (symbol or '').upper()
    # E3 — A-shares trade in uniform 100-share board lots (一手 = 100 股).
    if s.endswith('.SS') or s.endswith('.SZ'):
        return 100
    if not s.endswith('.HK'):
        return 1
    if s in _HK_LOT_SIZES:
        return _HK_LOT_SIZES[s]
    # Unknown HK ticker — fall back to 100 but emit a warning. Audit
    # finding: a wrong lot size silently over-sizes positions by up to 10x.
    _validate_hk_lot(s)
    return 100


def init_paper_tables() -> None:
    with _conn() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS paper_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            plan_json TEXT NOT NULL,
            initial_capital REAL NOT NULL,
            cash REAL NOT NULL,
            status TEXT DEFAULT 'active',
            start_date TEXT NOT NULL,
            last_run_date TEXT,
            email_on_run INTEGER DEFAULT 0,
            auto_run INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS paper_positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            shares REAL NOT NULL,
            entry_price REAL NOT NULL,
            entry_date TEXT NOT NULL,
            entry_reason TEXT,
            exit_price REAL,
            exit_date TEXT,
            exit_reason TEXT,
            pnl_abs REAL,
            pnl_pct REAL,
            status TEXT DEFAULT 'open',
            FOREIGN KEY(account_id) REFERENCES paper_accounts(id)
        );
        CREATE TABLE IF NOT EXISTS paper_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            position_id INTEGER,
            type TEXT NOT NULL,           -- 'buy' or 'sell'
            symbol TEXT NOT NULL,
            shares REAL NOT NULL,
            price REAL NOT NULL,
            value REAL NOT NULL,
            fee REAL NOT NULL,
            cash_after REAL NOT NULL,
            reason TEXT,
            ts_date TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(account_id) REFERENCES paper_accounts(id)
        );
        CREATE TABLE IF NOT EXISTS paper_equity_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            cash REAL NOT NULL,
            positions_value REAL NOT NULL,
            equity REAL NOT NULL,
            UNIQUE(account_id, date),
            FOREIGN KEY(account_id) REFERENCES paper_accounts(id)
        );
        CREATE INDEX IF NOT EXISTS idx_paper_pos_account ON paper_positions(account_id, status);
        CREATE INDEX IF NOT EXISTS idx_paper_tx_account ON paper_transactions(account_id, ts_date);
        CREATE INDEX IF NOT EXISTS idx_paper_eq_account ON paper_equity_history(account_id, date);

        -- Quant-agent learning log: each row is one round of strategy-tuning
        -- (walk-forward search) run against an account's symbols. If
        -- ``applied=1`` we also updated the account's plan_json to the
        -- winning config. Lets the user see how the agent has evolved its
        -- model over time without re-running the search.
        CREATE TABLE IF NOT EXISTS paper_account_evolutions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            trigger TEXT,                     -- manual | auto | api
            before_plan_json TEXT NOT NULL,
            after_plan_json TEXT NOT NULL,    -- = before_plan_json when not applied
            best_score REAL,
            baseline_score REAL,
            best_annual_pct REAL,
            baseline_annual_pct REAL,
            trials_count INTEGER,
            walk_forward INTEGER DEFAULT 1,
            applied INTEGER DEFAULT 0,
            top_json TEXT,                    -- compact top-N candidates for UI
            note TEXT,
            FOREIGN KEY(account_id) REFERENCES paper_accounts(id)
        );
        CREATE INDEX IF NOT EXISTS idx_paper_evo_account ON paper_account_evolutions(account_id, id DESC);

        -- P1b: every optimizer configuration ever tried, persisted so the
        -- deflated-Sharpe-style multiple-testing penalty can be computed
        -- honestly (you cannot deflate by trials you threw away). One row per
        -- try_config evaluation; run_id groups one optimize_plan invocation.
        CREATE TABLE IF NOT EXISTS optimizer_trials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            account_id INTEGER,
            ts TEXT DEFAULT CURRENT_TIMESTAMP,
            config_json TEXT NOT NULL,
            train_score REAL,
            oos_score REAL,
            annual_pct REAL,
            n_trades INTEGER,
            slice_json TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_opt_trials_run ON optimizer_trials(run_id);
        CREATE INDEX IF NOT EXISTS idx_opt_trials_account ON optimizer_trials(account_id, id DESC);
        ''')
        # Migration: add new columns if upgrading from older schema
        cols = {row[1] for row in c.execute('PRAGMA table_info(paper_accounts)').fetchall()}
        if 'email_on_run' not in cols:
            c.execute('ALTER TABLE paper_accounts ADD COLUMN email_on_run INTEGER DEFAULT 0')
        if 'auto_run' not in cols:
            c.execute('ALTER TABLE paper_accounts ADD COLUMN auto_run INTEGER DEFAULT 0')
        if 'max_drawdown_stop_pct' not in cols:
            c.execute('ALTER TABLE paper_accounts ADD COLUMN max_drawdown_stop_pct REAL DEFAULT 0')
        if 'peak_equity' not in cols:
            c.execute('ALTER TABLE paper_accounts ADD COLUMN peak_equity REAL DEFAULT 0')
        if 'paused_reason' not in cols:
            c.execute('ALTER TABLE paper_accounts ADD COLUMN paused_reason TEXT')
        if 'symbol_drawdown_stop_pct' not in cols:
            c.execute('ALTER TABLE paper_accounts ADD COLUMN symbol_drawdown_stop_pct REAL DEFAULT 0')
        if 'disabled_symbols_json' not in cols:
            c.execute("ALTER TABLE paper_accounts ADD COLUMN disabled_symbols_json TEXT DEFAULT '[]'")
        if 'base_currency' not in cols:
            c.execute("ALTER TABLE paper_accounts ADD COLUMN base_currency TEXT DEFAULT 'USD'")
        # T6.2/T6.3/T6.5 — paper_learning side tables. Done here so callers
        # don't need to import paper_learning separately to get the schema.
        try:
            from .paper_learning import (
                ensure_challengers_table, ensure_regime_table, ensure_bandit_table,
            )
            ensure_challengers_table(c)
            ensure_regime_table(c)
            ensure_bandit_table(c)
        except Exception:
            try:
                from web.modules.paper_learning import (  # type: ignore
                    ensure_challengers_table, ensure_regime_table, ensure_bandit_table,
                )
                ensure_challengers_table(c)
                ensure_regime_table(c)
                ensure_bandit_table(c)
            except Exception:
                pass
        if 'last_evolved_at' not in cols:
            c.execute('ALTER TABLE paper_accounts ADD COLUMN last_evolved_at TEXT')
        if 'live_score_last' not in cols:
            # T6.1 — snapshot of the most recent _live_fitness score at the
            # last evolution, so /api/paper/health and the dashboard can
            # show whether realized performance is improving or decaying.
            c.execute('ALTER TABLE paper_accounts ADD COLUMN live_score_last REAL')
        if 'evolve_frequency_days' not in cols:
            # 0 = disable auto-evolution; users opt-in by setting > 0
            c.execute('ALTER TABLE paper_accounts ADD COLUMN evolve_frequency_days INTEGER DEFAULT 0')
        # T6.5: record which sub-strategy fired the BUY signal for each
        # position so the Thompson-sampling bandit can credit/penalise
        # the right one when the position closes.
        pos_cols = {row[1] for row in c.execute('PRAGMA table_info(paper_positions)').fetchall()}
        if 'entry_strategy' not in pos_cols:
            c.execute('ALTER TABLE paper_positions ADD COLUMN entry_strategy TEXT')
        # T13 pairs-trading — short legs are tracked as a paper_position with
        # shares > 0 + is_short=1, so the MTM logic computes P&L correctly
        # (price down = profit). Default 0 keeps existing rows long-only.
        if 'is_short' not in pos_cols:
            c.execute('ALTER TABLE paper_positions ADD COLUMN is_short INTEGER DEFAULT 0')
        if 'pair_id' not in pos_cols:
            c.execute('ALTER TABLE paper_positions ADD COLUMN pair_id TEXT')
        # T17D — profit-taking exit ladder. Counts how many ladder steps
        # have fired on this position. After all steps, remainder rides
        # trailing stop only.
        if 'partial_exit_count' not in pos_cols:
            c.execute('ALTER TABLE paper_positions ADD COLUMN partial_exit_count INTEGER DEFAULT 0')
        if 'tick_running' not in cols:
            # Advisory lock for run_account_tick — set to a started-at ISO
            # timestamp while a tick is in flight, NULL when idle. Concurrent
            # ticks attempt an atomic 0→1 claim and bail if it loses the race.
            c.execute('ALTER TABLE paper_accounts ADD COLUMN tick_running TEXT')
        if 'last_tick_error' not in cols:
            # Stores the last tick traceback so the user/operator can see *why*
            # a stuck account stopped trading instead of having to grep logs.
            c.execute('ALTER TABLE paper_accounts ADD COLUMN last_tick_error TEXT')
        c.commit()
        # Admin audit trail — every reset/resume/force-evolve writes a row so
        # an accidental destructive call is at least traceable. We do NOT
        # store the full plan or transaction history (that lived in the
        # tables we may have just wiped); we capture intent + summary stats.
        c.executescript('''
        CREATE TABLE IF NOT EXISTS paper_admin_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            user_id INTEGER,
            action TEXT NOT NULL,            -- reset | resume | force_evolve | close | tick_unstick
            ts TEXT DEFAULT CURRENT_TIMESTAMP,
            details_json TEXT,
            FOREIGN KEY(account_id) REFERENCES paper_accounts(id)
        );
        CREATE INDEX IF NOT EXISTS idx_paper_admin_account
            ON paper_admin_actions(account_id, id DESC);

        -- Symbol-health tracker (Track 3). Each row is "we attempted to
        -- fetch OHLCV for this symbol and got either data or a None."
        -- Aggregated by symbol so we can detect persistent failures
        -- (delisting, ticker rename, halt) and surface them to the user
        -- instead of silently dropping the symbol from the universe.
        CREATE TABLE IF NOT EXISTS paper_symbol_health (
            symbol TEXT PRIMARY KEY,
            last_success_at TEXT,
            last_failure_at TEXT,
            last_failure_reason TEXT,
            consecutive_failures INTEGER DEFAULT 0,
            total_failures INTEGER DEFAULT 0,
            total_successes INTEGER DEFAULT 0
        );

        -- Static metadata per symbol — sector, industry, etc.  Populated
        -- lazily by _symbol_sector() and refreshed at most once per
        -- _SECTOR_TTL_DAYS. Lets the entry loop enforce sector
        -- concentration caps without hitting yfinance every tick.
        CREATE TABLE IF NOT EXISTS paper_symbol_meta (
            symbol TEXT PRIMARY KEY,
            sector TEXT,
            industry TEXT,
            fetched_at TEXT
        );

        -- ------------------------------------------------------------------
        -- Smart-Money Conviction Engine tables (T10)
        --
        -- News + 13F fusion pipeline. Persists everything (news, sentiment,
        -- 13F holdings, conviction scores) so the dashboard can plot
        -- multi-day trajectories and the fusion engine can read history.
        -- ------------------------------------------------------------------

        -- Raw news headlines we have ingested (any source: yfinance, RSS,
        -- EDGAR filings feed). Deduped by URL. body_excerpt is the first
        -- ~400 chars of the article summary if the source provides it;
        -- nullable.
        CREATE TABLE IF NOT EXISTS news_articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            source TEXT NOT NULL,
            url TEXT NOT NULL UNIQUE,
            headline TEXT NOT NULL,
            published_at TEXT,
            fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
            body_excerpt TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_news_symbol_date
            ON news_articles(symbol, published_at DESC);

        -- One row per (symbol, day, scorer). Scorer in {'lexicon','llm_haiku'}.
        -- Allows trajectory plotting + scorer-vs-scorer comparison.
        CREATE TABLE IF NOT EXISTS sentiment_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            score_date TEXT NOT NULL,
            sentiment_score REAL NOT NULL,      -- -1.0 .. +1.0
            bullish_hits INTEGER DEFAULT 0,
            bearish_hits INTEGER DEFAULT 0,
            articles_n INTEGER DEFAULT 0,
            themes_json TEXT DEFAULT '[]',
            scorer TEXT NOT NULL DEFAULT 'lexicon',
            confidence REAL,                    -- 0..1 — LLM self-report or lexicon coverage
            llm_thesis TEXT,                    -- one-line summary (LLM only)
            UNIQUE(symbol, score_date, scorer)
        );
        CREATE INDEX IF NOT EXISTS idx_sentiment_symbol_date
            ON sentiment_history(symbol, score_date DESC);

        -- Flattened 13F-HR positions. One row per fund (cik) per quarter
        -- per security. quarter_end is the period-of-report date (NOT the
        -- filing date) — that's the canonical join key for cross-fund
        -- comparison since 13Fs report as-of the same calendar dates.
        CREATE TABLE IF NOT EXISTS institutional_holdings_13f (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cik TEXT NOT NULL,
            fund_label TEXT NOT NULL,
            quarter_end TEXT NOT NULL,          -- YYYY-MM-DD
            cusip TEXT NOT NULL,
            symbol TEXT,                        -- may be NULL until CUSIP→ticker resolves
            shares REAL NOT NULL,
            value_usd REAL NOT NULL,
            pct_of_portfolio REAL,              -- 0..100 — computed at insert time
            filed_at TEXT,                      -- when the filing was accepted by SEC
            UNIQUE(cik, quarter_end, cusip)
        );
        CREATE INDEX IF NOT EXISTS idx_13f_cik_quarter
            ON institutional_holdings_13f(cik, quarter_end);
        CREATE INDEX IF NOT EXISTS idx_13f_symbol_quarter
            ON institutional_holdings_13f(symbol, quarter_end);

        -- CUSIP↔ticker mapping cache. Populated by OpenFIGI lookups + the
        -- SEC company_tickers.json bulk file. Long-lived; CUSIPs are
        -- stable across years.
        CREATE TABLE IF NOT EXISTS cusip_ticker_map (
            cusip TEXT PRIMARY KEY,
            symbol TEXT,
            name TEXT,
            source TEXT,                        -- 'openfigi' | 'sec_company_tickers' | 'manual'
            fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Daily fusion-engine output. rationale_json is the structured
        -- breakdown used to render the dashboard's "why" panel.
        CREATE TABLE IF NOT EXISTS conviction_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            score_date TEXT NOT NULL,
            conviction_score REAL NOT NULL,     -- 0..100
            news_factor REAL,                   -- 0..1
            flow_factor REAL,                   -- 0..1
            technical_factor REAL,              -- 0..1
            insider_factor REAL,                -- 0..1
            risk_penalty REAL,                  -- 0..1 (subtracted)
            rationale_json TEXT,
            recommended_entry_json TEXT,
            UNIQUE(symbol, score_date)
        );
        CREATE INDEX IF NOT EXISTS idx_conviction_date_score
            ON conviction_scores(score_date DESC, conviction_score DESC);
        CREATE INDEX IF NOT EXISTS idx_conviction_symbol_date
            ON conviction_scores(symbol, score_date DESC);

        -- ------------------------------------------------------------------
        -- T14 Options-wheel paper trading
        --
        -- One row per open or closed short-premium leg (CSP or CC).
        -- The wheel cycles: CSP → assigned → CC → called away → CSP …
        -- Assignment creates a matching paper_positions row (long stock).
        -- ------------------------------------------------------------------
        CREATE TABLE IF NOT EXISTS paper_options_positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            kind TEXT NOT NULL,            -- 'csp' | 'cc'
            underlying TEXT NOT NULL,
            strike REAL NOT NULL,
            expiry TEXT NOT NULL,          -- YYYY-MM-DD
            contracts INTEGER NOT NULL,
            side TEXT NOT NULL DEFAULT 'short',
            premium_collected REAL NOT NULL,  -- USD per share, × 100 × contracts = total
            open_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
                                          -- open | expired | assigned | closed_early
            close_date TEXT,
            close_reason TEXT,
            realized_pnl_usd REAL,
            mtm_value_usd REAL,            -- updated each tick
            UNIQUE(account_id, kind, underlying, strike, expiry)
        );
        CREATE INDEX IF NOT EXISTS idx_options_acct_status
            ON paper_options_positions(account_id, status);

        -- T17C — DCA scale-in plans. When the conviction engine recommends
        -- `dca_3_legs`, the entry loop creates a plan row and opens leg 1
        -- immediately; subsequent ticks open legs 2 & 3 on the cadence.
        CREATE TABLE IF NOT EXISTS paper_dca_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            total_dollars REAL NOT NULL,
            legs_total INTEGER NOT NULL DEFAULT 3,
            legs_filled INTEGER NOT NULL DEFAULT 0,
            leg_dollars REAL NOT NULL,
            cadence_days INTEGER NOT NULL DEFAULT 7,
            next_fill_date TEXT,
            status TEXT NOT NULL DEFAULT 'active',
                                   -- 'active' | 'completed' | 'cancelled'
            conviction_score_at_plan REAL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            completed_at TEXT,
            cancel_reason TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_dca_acct_status
            ON paper_dca_plans(account_id, status);
        CREATE INDEX IF NOT EXISTS idx_dca_next_fill
            ON paper_dca_plans(status, next_fill_date);
        ''')
        c.commit()


# ---------------------------------------------------------------------------
# Account lifecycle
# ---------------------------------------------------------------------------
_AI_MODES = {'manual', 'ai_picks'}


def create_account(user_id: int, plan: Dict[str, Any]) -> Dict[str, Any]:
    init_paper_tables()
    name = (plan.get('name') or f'Paper Trade {datetime.now().strftime("%Y%m%d_%H%M")}').strip()
    capital = float(plan.get('capital') or 10000)
    email_on_run = 1 if plan.get('email_on_run') else 0
    auto_run = 1 if plan.get('auto_run') else 0
    try:
        max_dd_stop = max(0.0, min(99.0, float(plan.get('max_drawdown_stop_pct') or 0)))
    except (TypeError, ValueError):
        max_dd_stop = 0.0
    try:
        sym_dd_stop = max(0.0, min(99.0, float(plan.get('symbol_drawdown_stop_pct') or 0)))
    except (TypeError, ValueError):
        sym_dd_stop = 0.0
    if capital <= 0:
        return {'success': False, 'error': '初始資金必須大於 0'}

    base_ccy = (plan.get('base_currency') or 'USD').upper()
    if base_ccy not in ('USD', 'HKD'):
        base_ccy = 'USD'

    # Options-follow accounts (3rd account type): instead of TA share signals
    # they follow the daily AI options recommendations. Delegate the whole
    # creation to the dedicated engine before the share-specific normalization
    # below (which assumes symbols/strategies that an options account lacks).
    if (plan.get('ai_mode') or '').lower() == 'options_follow':
        try:
            from .paper_options_follow import create_options_follow_account
        except ImportError:
            from web.modules.paper_options_follow import create_options_follow_account  # type: ignore
        return create_options_follow_account(
            user_id, plan, capital, base_ccy, email_on_run, auto_run)

    # AI mode + universe (new) — replaces fixed symbols when ai_mode=='ai_picks'
    ai_mode = (plan.get('ai_mode') or 'manual').lower()
    if ai_mode not in _AI_MODES:
        ai_mode = 'manual'
    universe = (plan.get('universe') or 'sp500_top50').lower()
    try:
        ai_pick_count = max(1, min(10, int(plan.get('ai_pick_count') or 5)))
    except (TypeError, ValueError):
        ai_pick_count = 5

    # Normalize symbols / strategies
    syms = plan.get('symbols') or 'AAPL'
    if isinstance(syms, str):
        syms = [s.strip().upper() for s in syms.split(',') if s.strip()]
    syms = syms[:5]
    # In AI-pick mode the symbols list is determined per-tick; for manual mode require at least one
    if ai_mode == 'manual' and not syms:
        return {'success': False, 'error': '至少需要一個股票代碼'}
    # Optional user-defined custom symbols for the 'custom' universe slot
    raw_custom = plan.get('custom_symbols') or []
    if isinstance(raw_custom, str):
        raw_custom = [s for s in raw_custom.replace('\n', ',').split(',')]
    custom_symbols = [s.strip().upper() for s in raw_custom if s and s.strip()][:200]

    if ai_mode == 'ai_picks':
        # Validate universe — accept built-in IDs and/or 'custom'
        try:
            from modules.ai_picks import UNIVERSES
        except Exception:
            from web.modules.ai_picks import UNIVERSES  # type: ignore
        ids = [u.strip().lower() for u in universe.split(',') if u.strip()]
        valid_ids = []
        for u in ids:
            if u in UNIVERSES or u == 'custom':
                valid_ids.append(u)
        if not valid_ids:
            return {'success': False, 'error': f'未知的市場範圍: {universe}'}
        if 'custom' in valid_ids and not custom_symbols:
            return {'success': False, 'error': '勾選了自訂市場池但未提供任何標的代碼'}
        universe = ','.join(sorted(set(valid_ids)))

    strats = plan.get('strategies') or [plan.get('strategy', 'ma_cross')]
    if isinstance(strats, str):
        strats = [s.strip() for s in strats.split(',') if s.strip()]

    # Strategy-quality defaults (uplift T9). The pre-T9 defaults
    # (combine='any', pos=20%, max_name=25%, no TP/SL, no VIX gate) produced
    # noisy entries and concentrated draws. The new defaults shift the
    # default account toward a higher-Sharpe profile while staying fully
    # overridable: any value the caller passes in still wins.
    plan_clean = {
        'symbols': syms,
        'strategies': strats,
        'combine_mode': (plan.get('combine_mode') or 'majority').lower(),
        'pos_size_pct': float(plan.get('pos_size_pct') or 10),
        'take_profit_pct': float(plan.get('take_profit_pct') or 12),
        'stop_loss_pct': float(plan.get('stop_loss_pct') or 6),
        'ai_mode': ai_mode,
        'universe': universe,
        'ai_pick_count': ai_pick_count,
        'custom_symbols': custom_symbols,
        'llm_news_filter': bool(plan.get('llm_news_filter')),
        'news_filter_mode': (plan.get('news_filter_mode') or 'lexicon').lower(),
        # Pro risk controls — defaults flipped on (each still overridable).
        'atr_stop_mult': float(plan.get('atr_stop_mult') or 2.0),         # 2*ATR(14) stop
        'trailing_stop_pct': float(plan.get('trailing_stop_pct') or 8.0), # ratchet 8% off high
        'max_per_name_pct': float(plan.get('max_per_name_pct') or 15),    # 15% per name cap
        'vix_gate_threshold': float(plan.get('vix_gate_threshold') or 30), # pause entries in panic
        'mtf_gate': bool(plan.get('mtf_gate', True)),                     # weekly trend gate ON
        'vol_target_annual_pct': float(plan.get('vol_target_annual_pct') or 0),  # 0 = use fixed sizing
        # Anti-churn + sizing hygiene.
        'hold_cooldown_days': max(0, int(plan.get('hold_cooldown_days', max(2, _DEFAULT_HOLD_COOLDOWN_DAYS)))),
        'min_trade_value': max(0.0, float(plan.get('min_trade_value') or _DEFAULT_MIN_TRADE_VALUE)),
        # Sector diversification — 35% cap per sector.
        'max_per_sector_pct': max(0.0, min(100.0, float(plan.get('max_per_sector_pct') or 35))),
        # T11 Kelly sizing — default ON for new accounts. Falls back to
        # vol_target / fixed when bandit has <20 samples per strategy.
        'sizing_mode': (plan.get('sizing_mode') or 'kelly').lower(),
        'kelly_safety': float(plan.get('kelly_safety') or 0.25),
        # T15 VWAP gate defaults — block entries chasing > 3% above the
        # 20-day typical-price VWAP, or > 8% below (falling-knife).
        'vwap_chase_max_pct': float(plan.get('vwap_chase_max_pct', 3.0)),
        'vwap_undercut_max_pct': float(plan.get('vwap_undercut_max_pct', 8.0)),
        'vwap_window': int(plan.get('vwap_window', 20)),
        # T17D — exit ladder. profit_ladder_pct = list of TP multipliers
        # (e.g. [1.0, 2.0] = trim at 1×TP and 2×TP). ladder_trim_fractions
        # = parallel list of fractions to trim at each step. Default ON
        # for new accounts: ladder at 1×TP / 2×TP, trim 1/3 each.
        'profit_ladder_pct': plan.get('profit_ladder_pct') or [1.0, 2.0],
        'ladder_trim_fractions': plan.get('ladder_trim_fractions') or [0.34, 0.33],
        # T18A — use GARCH forecasted vol in vol-target sizing (default ON).
        'use_garch': bool(plan.get('use_garch', True)),
        # T18C — gate entries when HMM regime posterior says we're in a bear state.
        'use_hmm_regime': bool(plan.get('use_hmm_regime', True)),
        # P1a — signal-fill timing. 'next_close' acts on yesterday's signal at
        # today's close (no same-bar look-ahead); 'same_close' is the legacy
        # behavior kept for accounts created before the fix so their replay
        # history stays reproducible. New accounts default to honest fills.
        'fill_mode': (plan.get('fill_mode') or 'next_close').lower(),
        # P1c — selection source for ai_picks mode: 'heuristic' (default) or
        # 'ml_ranker' (LightGBM learning-to-rank; falls back to heuristic
        # when the model is missing or stale).
        'pick_source': (plan.get('pick_source') or 'heuristic').lower(),
        # P7 — correlation-aware sizing, ON for new accounts. Legacy plans
        # without the field keep their exact pre-P7 sizing (the tick reads
        # plan.get('corr_aware_sizing') with a falsy default).
        'corr_aware_sizing': bool(plan.get('corr_aware_sizing', True)),
        # E1 — dual-source earnings calendar (Finnhub+Nasdaq+yfinance with
        # agreement gating). ON for new accounts; legacy/frozen accounts
        # (absent key = falsy) keep the exact yfinance-only path.
        'earnings_v2': bool(plan.get('earnings_v2', True)),
        # E2 — Jump Model regime gate. Default False EVEN FOR NEW ACCOUNTS:
        # the JM runs in shadow (jump_regime_state logs agreement vs HMM
        # nightly) until the disagreement record justifies an experiment.
        'use_jump_regime': bool(plan.get('use_jump_regime', False)),
        # E3 — T+1 settlement for mainland A-shares (no same-day sells,
        # stops included). ON for new accounts; legacy plans (absent key)
        # are unaffected — they hold no CN symbols anyway.
        'cn_t_plus_one': bool(plan.get('cn_t_plus_one', True)),
    }
    today = date.today().isoformat()

    with _conn() as c:
        # Enable the self-improvement loop for new accounts by default
        # (weekly). Previously this defaulted to 0 → _maybe_auto_evolve never
        # fired, so the learning loop was inert. Overridable via the plan.
        evolve_freq = int(plan.get('evolve_frequency_days') or 7)
        cur = c.execute(
            '''INSERT INTO paper_accounts
               (user_id, name, plan_json, initial_capital, cash, status, start_date,
                email_on_run, auto_run, max_drawdown_stop_pct, peak_equity,
                symbol_drawdown_stop_pct, disabled_symbols_json, base_currency,
                evolve_frequency_days)
               VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, '[]', ?, ?)''',
            (user_id, name, json.dumps(plan_clean), capital, capital, today,
             email_on_run, auto_run, max_dd_stop, capital, sym_dd_stop, base_ccy,
             evolve_freq),
        )
        account_id = cur.lastrowid
        # Seed equity history with the starting balance
        c.execute(
            'INSERT OR REPLACE INTO paper_equity_history (account_id, date, cash, positions_value, equity) VALUES (?, ?, ?, ?, ?)',
            (account_id, today, capital, 0.0, capital),
        )
        c.commit()
    return {'success': True, 'account_id': account_id, 'name': name, 'plan': plan_clean}


def list_accounts(user_id: int) -> Dict[str, Any]:
    init_paper_tables()
    with _conn() as c:
        rows = c.execute(
            '''SELECT a.*,
                      (SELECT COUNT(*) FROM paper_positions p WHERE p.account_id=a.id AND p.status='open') AS open_count,
                      (SELECT COUNT(*) FROM paper_positions p WHERE p.account_id=a.id AND p.status='closed') AS closed_count,
                      (SELECT equity FROM paper_equity_history e WHERE e.account_id=a.id ORDER BY date DESC LIMIT 1) AS equity
               FROM paper_accounts a
               WHERE a.user_id = ?
               ORDER BY a.created_at DESC''',
            (user_id,),
        ).fetchall()
    accts = []
    for r in rows:
        eq = r['equity'] if r['equity'] is not None else r['initial_capital']
        roi = (eq / r['initial_capital'] - 1) * 100 if r['initial_capital'] else 0
        plan_r = json.loads(r['plan_json'])
        open_n, closed_n = r['open_count'], r['closed_count']
        # Options-follow accounts track positions in a separate table.
        if (plan_r.get('ai_mode') or '').lower() == 'options_follow':
            try:
                from .paper_options_follow import option_counts
            except ImportError:
                from web.modules.paper_options_follow import option_counts  # type: ignore
            oc = option_counts(r['id'])
            open_n, closed_n = oc['open'], oc['closed']
        accts.append({
            'id': r['id'],
            'name': r['name'],
            'status': r['status'],
            'start_date': r['start_date'],
            'last_run_date': r['last_run_date'],
            'initial_capital': r['initial_capital'],
            'cash': r['cash'],
            'equity': eq,
            'roi_pct': round(roi, 3),
            'open_positions': open_n,
            'closed_positions': closed_n,
            'plan': plan_r,
            'max_drawdown_stop_pct': r['max_drawdown_stop_pct'] if 'max_drawdown_stop_pct' in r.keys() else 0,
            'peak_equity': r['peak_equity'] if 'peak_equity' in r.keys() else None,
            'paused_reason': r['paused_reason'] if 'paused_reason' in r.keys() else None,
            'auto_run': bool(r['auto_run']) if 'auto_run' in r.keys() else False,
            'email_on_run': bool(r['email_on_run']) if 'email_on_run' in r.keys() else False,
            'base_currency': (r['base_currency'] if 'base_currency' in r.keys() and r['base_currency'] else 'USD'),
        })
    return {'success': True, 'accounts': accts}


def get_account_detail(user_id: int, account_id: int) -> Dict[str, Any]:
    init_paper_tables()
    with _conn() as c:
        a = c.execute('SELECT * FROM paper_accounts WHERE id=? AND user_id=?',
                      (account_id, user_id)).fetchone()
        if not a:
            return {'success': False, 'error': 'Account not found'}
        positions = [dict(r) for r in c.execute(
            'SELECT * FROM paper_positions WHERE account_id=? ORDER BY status DESC, entry_date DESC',
            (account_id,)).fetchall()]
        transactions = [dict(r) for r in c.execute(
            'SELECT * FROM paper_transactions WHERE account_id=? ORDER BY ts_date DESC, id DESC LIMIT 500',
            (account_id,)).fetchall()]
        equity = [dict(r) for r in c.execute(
            'SELECT date, cash, positions_value, equity FROM paper_equity_history WHERE account_id=? ORDER BY date',
            (account_id,)).fetchall()]

    plan = json.loads(a['plan_json'])
    last_eq = equity[-1]['equity'] if equity else a['initial_capital']
    open_pos = [p for p in positions if p['status'] == 'open']
    closed_pos = [p for p in positions if p['status'] == 'closed']
    wins = sum(1 for p in closed_pos if (p['pnl_pct'] or 0) > 0)
    win_rate = (wins / len(closed_pos) * 100) if closed_pos else 0

    # Options-follow accounts hold their positions in a separate table; pull
    # them so the dashboard can render legs/expiry/POP/MTM, and override the
    # share-based counts/win-rate with the option-position equivalents.
    option_positions: List[Dict[str, Any]] = []
    if (plan.get('ai_mode') or '').lower() == 'options_follow':
        try:
            from .paper_options_follow import option_positions_for
        except ImportError:
            from web.modules.paper_options_follow import option_positions_for  # type: ignore
        option_positions = option_positions_for(account_id)
        opt_open = [p for p in option_positions if p['status'] == 'open']
        opt_closed = [p for p in option_positions if p['status'] == 'settled']
        opt_wins = sum(1 for p in opt_closed if (p.get('realized_pnl_usd') or 0) > 0)
        open_pos = opt_open
        closed_pos = opt_closed
        win_rate = (opt_wins / len(opt_closed) * 100) if opt_closed else 0

    return {
        'success': True,
        'option_positions': option_positions,
        'account': {
            'id': a['id'],
            'name': a['name'],
            'status': a['status'],
            'start_date': a['start_date'],
            'last_run_date': a['last_run_date'],
            'initial_capital': a['initial_capital'],
            'cash': a['cash'],
            'equity': last_eq,
            'roi_pct': round((last_eq / a['initial_capital'] - 1) * 100, 3) if a['initial_capital'] else 0,
            'win_rate': round(win_rate, 2),
            'open_count': len(open_pos),
            'closed_count': len(closed_pos),
            'plan': plan,
            'max_drawdown_stop_pct': a['max_drawdown_stop_pct'] if 'max_drawdown_stop_pct' in a.keys() else 0,
            'peak_equity': a['peak_equity'] if 'peak_equity' in a.keys() else None,
            'paused_reason': a['paused_reason'] if 'paused_reason' in a.keys() else None,
            'auto_run': bool(a['auto_run']) if 'auto_run' in a.keys() else False,
            'email_on_run': bool(a['email_on_run']) if 'email_on_run' in a.keys() else False,
            'symbol_drawdown_stop_pct': a['symbol_drawdown_stop_pct'] if 'symbol_drawdown_stop_pct' in a.keys() else 0,
            'disabled_symbols': json.loads(a['disabled_symbols_json'] or '[]') if 'disabled_symbols_json' in a.keys() and a['disabled_symbols_json'] else [],
            'base_currency': (a['base_currency'] if 'base_currency' in a.keys() and a['base_currency'] else 'USD'),
        },
        'positions': positions,
        'transactions': transactions,
        'equity_history': equity,
    }


def reenable_symbol(user_id: int, account_id: int, symbol: str) -> Dict[str, Any]:
    init_paper_tables()
    symbol = (symbol or '').strip().upper()
    with _conn() as c:
        a = c.execute('SELECT * FROM paper_accounts WHERE id=? AND user_id=?',
                      (account_id, user_id)).fetchone()
        if not a:
            return {'success': False, 'error': 'Account not found'}
        try:
            disabled = set(json.loads(a['disabled_symbols_json'] or '[]'))
        except Exception:
            disabled = set()
        if symbol in disabled:
            disabled.remove(symbol)
        c.execute('UPDATE paper_accounts SET disabled_symbols_json=? WHERE id=?',
                  (json.dumps(sorted(disabled)), account_id))
        c.commit()
    return {'success': True, 'disabled_symbols': sorted(disabled)}


def get_attribution(user_id: int, account_id: int) -> Dict[str, Any]:
    """Performance attribution: P&L by exit reason, by symbol, win rates.

    Helps a user see whether their gains come from TP hits, signal flips,
    trailing stops, or just luck on a few names. Critical pro feature for
    diagnosing strategy decay vs random variance.
    """
    init_paper_tables()
    with _conn() as c:
        a = c.execute('SELECT id, base_currency FROM paper_accounts WHERE id=? AND user_id=?',
                      (account_id, user_id)).fetchone()
        if not a:
            return {'success': False, 'error': 'Account not found'}
        ccy = (a['base_currency'] if 'base_currency' in a.keys() and a['base_currency'] else 'USD')

        # Group by exit_reason
        by_reason_rows = c.execute(
            "SELECT COALESCE(exit_reason,'open') AS reason, "
            "       COUNT(*) AS n, "
            "       COALESCE(SUM(pnl_abs),0) AS pnl_abs, "
            "       COALESCE(AVG(pnl_pct),0) AS avg_pct, "
            "       SUM(CASE WHEN COALESCE(pnl_abs,0) > 0 THEN 1 ELSE 0 END) AS wins "
            "FROM paper_positions WHERE account_id=? AND status='closed' "
            "GROUP BY exit_reason ORDER BY pnl_abs DESC",
            (account_id,),
        ).fetchall()
        by_reason = [{
            'exit_reason': r['reason'],
            'count': r['n'],
            'wins': r['wins'],
            'win_rate_pct': round((r['wins'] / r['n']) * 100, 2) if r['n'] else 0,
            'pnl_abs': round(float(r['pnl_abs']), 2),
            'avg_pct': round(float(r['avg_pct']), 2),
        } for r in by_reason_rows]

        # Group by symbol
        by_symbol_rows = c.execute(
            "SELECT symbol, COUNT(*) AS n, "
            "       COALESCE(SUM(pnl_abs),0) AS pnl_abs, "
            "       COALESCE(AVG(pnl_pct),0) AS avg_pct, "
            "       SUM(CASE WHEN COALESCE(pnl_abs,0) > 0 THEN 1 ELSE 0 END) AS wins "
            "FROM paper_positions WHERE account_id=? AND status='closed' "
            "GROUP BY symbol ORDER BY pnl_abs DESC",
            (account_id,),
        ).fetchall()
        by_symbol = [{
            'symbol': r['symbol'],
            'count': r['n'],
            'wins': r['wins'],
            'win_rate_pct': round((r['wins'] / r['n']) * 100, 2) if r['n'] else 0,
            'pnl_abs': round(float(r['pnl_abs']), 2),
            'avg_pct': round(float(r['avg_pct']), 2),
        } for r in by_symbol_rows]

        total_pnl = sum(r['pnl_abs'] for r in by_reason)
        total_n = sum(r['count'] for r in by_reason)
        total_wins = sum(r['wins'] for r in by_reason)
    return {
        'success': True,
        'account_id': account_id,
        'base_currency': ccy,
        'totals': {
            'closed_count': total_n,
            'wins': total_wins,
            'win_rate_pct': round((total_wins / total_n) * 100, 2) if total_n else 0,
            'pnl_abs': round(total_pnl, 2),
        },
        'by_exit_reason': by_reason,
        'by_symbol': by_symbol,
    }


def reset_account(user_id: int, account_id: int) -> Dict[str, Any]:
    """Wipe an account's history and put it back in fresh-account state.

    Used to recover accounts that got stranded by the pre-fix entry bug
    (last_run_date stamped without any transactions). Keeps the original
    plan/symbols/strategies/initial_capital — only erases the runtime
    state (positions, transactions, equity history, cash, peak, blacklist)
    so a 補回 (catch-up) replays the entire window with the fixed engine.
    """
    init_paper_tables()
    with _conn() as c:
        a = c.execute('SELECT * FROM paper_accounts WHERE id=? AND user_id=?',
                      (account_id, user_id)).fetchone()
        if not a:
            return {'success': False, 'error': 'Account not found'}
        if a['status'] == 'closed':
            return {'success': False, 'error': '已結束的帳戶無法重置'}
        # Capture what we're about to delete for the audit row — reset is
        # destructive and an operator typo can nuke months of history.
        pre = c.execute(
            "SELECT (SELECT COUNT(*) FROM paper_transactions WHERE account_id=?) AS tx,"
            "       (SELECT COUNT(*) FROM paper_positions WHERE account_id=?) AS pos,"
            "       (SELECT COUNT(*) FROM paper_equity_history WHERE account_id=?) AS eq",
            (account_id, account_id, account_id)).fetchone()
        capital = float(a['initial_capital'])
        start_date = a['start_date']
        c.execute('DELETE FROM paper_transactions WHERE account_id=?', (account_id,))
        c.execute('DELETE FROM paper_positions WHERE account_id=?', (account_id,))
        c.execute('DELETE FROM paper_equity_history WHERE account_id=?', (account_id,))
        # Options-follow accounts also keep positions in their own table.
        try:
            from .paper_options_follow import delete_option_positions
        except ImportError:
            try:
                from web.modules.paper_options_follow import delete_option_positions  # type: ignore
            except ImportError:
                delete_option_positions = None  # type: ignore
        if delete_option_positions:
            try:
                delete_option_positions(account_id, c)
            except Exception:
                pass
        c.execute(
            "UPDATE paper_accounts SET status='active', cash=?, last_run_date=NULL, "
            "peak_equity=?, disabled_symbols_json='[]', paused_reason=NULL, "
            "tick_running=NULL, last_tick_error=NULL WHERE id=?",
            (capital, capital, account_id),
        )
        c.execute(
            'INSERT INTO paper_equity_history (account_id, date, cash, positions_value, equity) VALUES (?, ?, ?, ?, ?)',
            (account_id, start_date, capital, 0.0, capital),
        )
        c.commit()
    _record_admin_action(account_id, user_id, 'reset', {
        'deleted_transactions': pre['tx'], 'deleted_positions': pre['pos'],
        'deleted_equity_rows': pre['eq'], 'restored_capital': capital,
    })
    _log(account_id, 'warning',
         f"reset (deleted tx={pre['tx']} pos={pre['pos']} eq={pre['eq']} cap=${capital:.2f})")
    return {'success': True, 'account_id': account_id,
            'deleted_transactions': pre['tx'],
            'deleted_positions': pre['pos'],
            'deleted_equity_rows': pre['eq']}


# ---------------------------------------------------------------------------
# Quant-agent learning loop — walk-forward search that evolves an account's
# plan toward the best-performing strategy mix on its own symbols.
#
# Architecture: we reuse ``autotrade_sim.optimize_plan`` (which already does
# random + local-refinement search with walk-forward train/test split). Then
# we compare the winner's out-of-sample score to the *current* live plan's
# score on the same window. If the winner clearly beats the baseline we
# apply it to the account; otherwise we still record the trial so the user
# can see the search history. Either way we never silently swap in a config
# that lost out-of-sample — overfitting protection is the whole point of
# walk-forward scoring.
# ---------------------------------------------------------------------------
_EVOLVE_MIN_TRIALS = 30
_EVOLVE_MAX_TRIALS = 80
_EVOLVE_MIN_GAIN = 3.0   # OOS score lead before swapping plan. Lowered from
                         # 5.0 (Phase 5): now that backtest scores are HONEST
                         # (real costs/fills + benchmark alpha), absolute scores
                         # are lower, so a 5-pt lead was too high a bar and
                         # rejected genuine incremental improvements. 3.0 still
                         # requires a clear edge; the walk-forward OOS re-rank +
                         # guardrails (GR1-3) remain the overfit protection.
# T6.1: how much the LIVE realized P&L should count vs the backtest OOS
# score. 0.0 = pure backtest (legacy behavior); 1.0 = pure live. 0.4 is
# a middle ground that lets live evidence move the score by ~40% while
# still grounding new evolutions in robust walk-forward backtest data.
_LIVE_FITNESS_WEIGHT = 0.4
# Minimum number of closed live trades since last_evolved_at before the
# live component is trusted. With fewer trades the realized P&L is too
# noisy; we fall back to pure-backtest scoring.
_LIVE_FITNESS_MIN_TRADES = 3


def _classify_current_regime() -> Dict[str, Any]:
    """Fetch SPY + VIX from yfinance, classify, persist. Returns the
    classification dict (regime, vix, spy_ret_20d_pct, ...) or
    ``regime=unknown`` when fetch fails — never raises.

    Cached: at most one classify per UTC date. Subsequent calls within
    the same day reuse the persisted row.
    """
    try:
        try:
            from .paper_learning import (
                classify_regime, upsert_regime, REGIME_UNKNOWN,
            )
        except Exception:
            from web.modules.paper_learning import (  # type: ignore
                classify_regime, upsert_regime, REGIME_UNKNOWN,
            )
    except Exception:
        return {'regime': 'unknown', 'reason': 'paper_learning import failed'}
    today_iso = date.today().isoformat()
    # Same-day cache check
    try:
        with _conn() as c:
            row = c.execute(
                'SELECT regime, vix, spy_ret_20d_pct, reason, classified_at '
                'FROM market_regime_daily WHERE date=?',
                (today_iso,)).fetchone()
        if row:
            return {
                'regime': row['regime'], 'vix': row['vix'],
                'spy_ret_20d_pct': row['spy_ret_20d_pct'],
                'reason': row['reason'], 'classified_at': row['classified_at'],
                'cached': True,
            }
    except Exception:
        pass
    # Fresh classify
    spy_closes: Optional[List[float]] = None
    try:
        data = _fetch('SPY', '3mo')
        if data:
            _, spy_closes, _, _ = data
    except Exception as e:
        _log(None, 'warning', f'regime: SPY fetch failed: {e}')
    vix_level = None
    try:
        vix_level = _vix_latest()
    except Exception as e:
        _log(None, 'warning', f'regime: VIX fetch failed: {e}')
    cls = classify_regime(spy_closes=spy_closes, vix_level=vix_level)
    try:
        upsert_regime(today_iso, cls, _conn)
    except Exception as e:
        _log(None, 'warning', f'regime persist failed: {e}')
    cls['cached'] = False
    return cls


def _live_fitness(account_id: int, since_iso: Optional[str],
                  target_annual_pct: float) -> Dict[str, Any]:
    """Score the account's REALIZED equity curve since ``since_iso`` (or
    since account creation if None). Mirrors autotrade_sim._score_result
    so the result is directly blendable with the optimizer's OOS score.

    Returns ``{score, annual_return_pct, max_dd_pct, sharpe, n_trades,
    period_days, applicable, reason}``. ``applicable`` is False when
    there's not enough data — the caller should then fall back to pure
    backtest scoring.
    """
    init_paper_tables()
    out: Dict[str, Any] = {
        'score': 0.0, 'annual_return_pct': 0.0, 'max_dd_pct': 0.0,
        'sharpe': 0.0, 'n_trades': 0, 'period_days': 0,
        'applicable': False, 'reason': '',
    }
    try:
        with _conn() as c:
            a = c.execute('SELECT initial_capital, start_date FROM paper_accounts WHERE id=?',
                          (account_id,)).fetchone()
            if not a:
                out['reason'] = 'account not found'
                return out
            initial_capital = float(a['initial_capital'] or 0)
            # Pick the window: explicit since_iso > account start_date.
            window_start = since_iso or a['start_date']
            equity_rows = c.execute(
                'SELECT date, equity FROM paper_equity_history '
                'WHERE account_id=? AND date >= ? ORDER BY date',
                (account_id, window_start)).fetchall()
            if len(equity_rows) < 5:
                out['reason'] = f'only {len(equity_rows)} equity snapshots since {window_start}'
                return out
            trade_rows = c.execute(
                "SELECT pnl_pct FROM paper_positions "
                "WHERE account_id=? AND status='closed' AND exit_date >= ?",
                (account_id, window_start)).fetchall()
    except Exception as e:
        out['reason'] = f'db read failed: {e}'
        return out

    n_trades = len(trade_rows)
    out['n_trades'] = n_trades
    out['period_days'] = max(1, len(equity_rows))

    if n_trades < _LIVE_FITNESS_MIN_TRADES:
        out['reason'] = f'only {n_trades} closed trades — need >= {_LIVE_FITNESS_MIN_TRADES}'
        return out

    # Total return = (last_equity / first_equity) - 1
    first_eq = float(equity_rows[0]['equity'] or initial_capital)
    last_eq = float(equity_rows[-1]['equity'] or initial_capital)
    if first_eq <= 0:
        first_eq = initial_capital or 1.0
    total_ret_pct = ((last_eq / first_eq) - 1.0) * 100.0

    # Annualized — period_days approximated by snapshot count (one per
    # trading day), so we use 252-day year for the compound.
    period_days = max(1, len(equity_rows))
    annual = (((1.0 + total_ret_pct / 100.0) ** (252.0 / period_days)) - 1.0) * 100.0

    # Max drawdown from the rolling peak
    peak = first_eq
    max_dd_pct = 0.0
    for r in equity_rows:
        eq = float(r['equity'] or 0)
        if eq > peak:
            peak = eq
        if peak > 0:
            dd = (peak - eq) / peak * 100.0
            if dd > max_dd_pct:
                max_dd_pct = dd

    # Sharpe — daily returns from the equity series, annualized 252.
    rets: List[float] = []
    for i in range(1, len(equity_rows)):
        prev = float(equity_rows[i - 1]['equity'] or 0)
        cur = float(equity_rows[i]['equity'] or 0)
        if prev > 0:
            rets.append(cur / prev - 1.0)
    if len(rets) > 5:
        import statistics
        mean = statistics.fmean(rets)
        try:
            std = statistics.stdev(rets)
        except statistics.StatisticsError:
            std = 0.0
        sharpe = (mean / std * (252 ** 0.5)) if std > 0 else 0.0
    else:
        sharpe = 0.0

    # Score via the SHARED scorer (autotrade_sim._score_components) so the live
    # realized-equity score and the optimizer's backtest score use one formula
    # and can never drift. Both now include the alpha term; the live benchmark
    # is passed as 0 for now (computing buy-and-hold over the live equity window
    # is a documented follow-up), so the live alpha term reduces to +0.5*annual.
    # This intentionally differs from the pre-Phase-3 live formula by that
    # amount — the optimizer baseline moved by the same construction, so the
    # baseline↔live blend stays internally consistent.
    try:
        from modules.autotrade_sim import _score_components
    except Exception:  # pragma: no cover - import path shim
        from web.modules.autotrade_sim import _score_components  # type: ignore
    score = _score_components(annual, max_dd_pct, sharpe, total_ret_pct,
                              n_trades, target_annual_pct,
                              benchmark_annual_pct=0.0)
    out.update({
        'score': round(score, 3),
        'annual_return_pct': round(annual, 3),
        'max_dd_pct': round(max_dd_pct, 3),
        'sharpe': round(sharpe, 3),
        'total_return_pct': round(total_ret_pct, 3),
        'applicable': True,
        'reason': 'ok',
    })
    return out


def _blend_baseline_with_live(baseline_score: float, baseline_annual: float,
                              live: Dict[str, Any]) -> Tuple[float, float, float]:
    """Returns (blended_score, blended_annual, live_weight_used).

    If live isn't applicable (too few trades), the weight collapses to 0
    and we return the baseline unchanged.
    """
    if not live.get('applicable'):
        return baseline_score, baseline_annual, 0.0
    w = _LIVE_FITNESS_WEIGHT
    blended_score = (1.0 - w) * baseline_score + w * float(live['score'])
    blended_annual = (1.0 - w) * baseline_annual + w * float(live['annual_return_pct'])
    return blended_score, blended_annual, w


def _account_universe(plan: Dict[str, Any]) -> List[str]:
    """Effective symbol universe to optimize against."""
    if (plan.get('ai_mode') or 'manual') == 'ai_picks':
        # AI mode rotates symbols nightly. For evolution, optimize on the
        # account's currently-held names plus any custom_symbols slot so we
        # have a stable basket to score against.
        syms = list(plan.get('custom_symbols') or [])
        if not syms:
            syms = plan.get('symbols') or ['SPY']
    else:
        syms = plan.get('symbols') or ['SPY']
    # Cap so the walk-forward search doesn't blow up runtime.
    return [s.upper() for s in syms][:5]


def evolve_account_plan(user_id: int, account_id: int,
                        target_monthly_pct: float = 5.0,
                        trigger: str = 'manual',
                        apply_if_better: bool = True,
                        max_iterations: Optional[int] = None,
                        expand_search: bool = False) -> Dict[str, Any]:
    """
    Run one generation of strategy evolution for an account.

    expand_search defaults to False so we REFINE within the strategies the
    user already picked. Set True to let the optimizer also explore other
    strategies — useful when the current mix is underperforming and the
    user wants the agent to suggest something new.

    Per-account RNG seed (account_id) ensures two different accounts on
    the same symbol universe don't converge on the same "lucky" config —
    audit finding #20.

    Returns: {success, applied, before, after, baseline, best, top, trials,
             search_space}.
    """
    init_paper_tables()
    try:
        try:
            from modules.autotrade_sim import (
                optimize_plan, simulate_plan, _score_result, _period_to_days,
                score_plan_oos,
            )
        except Exception:
            from web.modules.autotrade_sim import (  # type: ignore
                optimize_plan, simulate_plan, _score_result, _period_to_days,
                score_plan_oos,
            )
    except Exception as e:
        return {'success': False, 'error': f'autotrade_sim unavailable: {e}'}

    with _conn() as c:
        a = c.execute('SELECT * FROM paper_accounts WHERE id=? AND user_id=?',
                      (account_id, user_id)).fetchone()
        if not a:
            return {'success': False, 'error': 'Account not found'}
        plan = json.loads(a['plan_json'])
        capital = float(a['initial_capital'])

    symbols = _account_universe(plan)
    if not symbols:
        return {'success': False, 'error': '無法確定優化標的'}

    target_annual = round(((1.0 + target_monthly_pct / 100.0) ** 12 - 1.0) * 100.0, 2)
    base_plan = {
        'symbols': symbols,
        'strategies': plan.get('strategies') or ['ma_cross'],
        'combine_mode': plan.get('combine_mode', 'any'),
        'pos_size_pct': plan.get('pos_size_pct', 20),
        'take_profit_pct': plan.get('take_profit_pct', 10),
        'stop_loss_pct': plan.get('stop_loss_pct', 5),
        'capital': capital,
        # P4 — 2y window so the purged OOS region splits into 2 folds
        # (oos_fold_slices needs >=60 bars per fold); on the old 1y window
        # CV degraded to the single 70/30 split.
        'period': '2y',
    }
    # Carry the account's REAL risk controls so the honest simulator
    # (autotrade_sim._simulate_symbol) scores the configuration the account
    # actually trades — not a stripped one. optimize_plan's try_config does
    # dict(base_plan), so these flow into every candidate too. Only copy keys
    # that are actually set, so the simulator's own defaults apply otherwise
    # (and we never inject a None that would break int()/float() parsing).
    for _rk in ('atr_stop_mult', 'trailing_stop_pct', 'profit_ladder_pct',
                'ladder_trim_fractions', 'min_trade_value', 'hold_cooldown_days',
                'fill_mode'):
        if plan.get(_rk) is not None:
            base_plan[_rk] = plan[_rk]

    # Score the current live plan on the SAME purged OOS folds the optimizer
    # validates candidates with (P4) — champion and challengers are judged
    # on identical data, and no single lucky window decides either.
    days = _period_to_days(base_plan['period'])
    test_days = days - int(days * 0.7)
    baseline_oos = score_plan_oos(base_plan, target_annual, days, train_pct=0.7)
    if baseline_oos['n_folds'] == 0:
        baseline_score = -1e9
        baseline_annual = 0.0
        baseline_metrics = {}
        backtest_only_score = -1e9
    else:
        baseline_score = baseline_oos['score']
        baseline_annual = baseline_oos['annual_return_pct']
        baseline_metrics = baseline_oos['metrics']
        backtest_only_score = baseline_score

    # T6.1 — blend with realized live P&L since the account's last evolution
    # (or since creation if never evolved). This makes the optimizer actually
    # LEARN from how the live plan has been performing, not just from
    # walk-forward backtests on yfinance data.
    last_evolved_at = None
    try:
        with _conn() as c:
            row = c.execute(
                'SELECT last_evolved_at FROM paper_accounts WHERE id=?',
                (account_id,)).fetchone()
            if row and row['last_evolved_at']:
                # last_evolved_at is an ISO datetime; we need a date for
                # the equity-history filter. Take the date portion.
                last_evolved_at = row['last_evolved_at'].split('T')[0]
    except Exception:
        last_evolved_at = None
    live = _live_fitness(account_id, last_evolved_at, target_annual)
    baseline_score, baseline_annual, live_weight_used = _blend_baseline_with_live(
        baseline_score, baseline_annual, live,
    )
    # T6.3 — tag this evolution with the current market regime so
    # subsequent runs can prefer plans that win in THIS regime, and so
    # T6.6 guardrails can refuse swaps when the regime just flipped.
    regime = _classify_current_regime()

    iters = max_iterations or _EVOLVE_MIN_TRIALS
    iters = max(_EVOLVE_MIN_TRIALS, min(_EVOLVE_MAX_TRIALS, int(iters)))

    # P1b — persist every configuration the optimizer evaluates so the
    # multiple-testing deflation is auditable (optimizer_trials table).
    import uuid as _uuid
    run_id = _uuid.uuid4().hex

    def _trial_sink(rec: Dict[str, Any]) -> None:
        try:
            with _conn() as tc:
                tc.execute(
                    '''INSERT INTO optimizer_trials
                       (run_id, account_id, config_json, train_score, oos_score,
                        annual_pct, n_trades, slice_json)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                    (run_id, account_id, json.dumps(rec.get('config') or {}),
                     rec.get('train_score'), rec.get('oos_score'),
                     rec.get('annual_pct'), rec.get('n_trades'),
                     json.dumps(rec.get('slice') or {})))
                tc.commit()
        except Exception:
            pass  # trial logging is best-effort; never fail the evolution

    # Per-account seed prevents the cross-account convergence audit issue.
    opt = optimize_plan(base_plan, target_monthly_pct=target_monthly_pct,
                        max_iterations=iters, walk_forward=True, train_pct=0.7,
                        expand_search=expand_search,
                        rng_seed=account_id, trial_sink=_trial_sink)
    if not opt.get('success'):
        return {'success': False, 'error': opt.get('error', 'optimization failed'),
                'baseline_score': round(baseline_score, 3),
                'baseline_annual_pct': round(baseline_annual, 3)}

    best = opt.get('best') or {}
    # P1b — compare the searched winner to the (un-searched) live baseline on
    # its DEFLATED score: the baseline is one config, the winner is the max of
    # N trials, so the raw comparison is biased toward swapping plans.
    best_score = float(best.get('score_deflated',
                                best.get('score') or -1e9))
    best_annual = float(best.get('annual_return_pct') or 0.0)
    new_plan_fields = best.get('plan') or {}

    # T6.2 — champion/challenger evaluation. The optimizer's top-1 plan
    # gets added to the challenger pool (capped at MAX_CHALLENGERS), and
    # every existing active challenger is re-scored against the new
    # champion baseline. A challenger only promotes after sustained
    # OOS wins (WIN_STREAK_TO_PROMOTE).
    challenger_summary: Dict[str, Any] = {}
    try:
        try:
            from . import paper_learning as _pl
        except Exception:
            from web.modules import paper_learning as _pl  # type: ignore

        # Seed: add the optimizer's winner as a fresh challenger if it
        # has the strategy fields we need and isn't the live plan.
        if new_plan_fields:
            cand = dict(plan)
            for k in ('strategies', 'combine_mode', 'take_profit_pct',
                      'stop_loss_pct', 'pos_size_pct'):
                if k in new_plan_fields and new_plan_fields[k] is not None:
                    cand[k] = new_plan_fields[k]
            _pl.add_challenger(account_id, cand, source='optimizer',
                               conn_factory=_conn,
                               note=f'evolution {datetime.now().isoformat()[:19]}')

        # T6.4 — additional challenger sources: random mutation, GA, LLM.
        # Each runs best-effort and only adds a challenger if a slot is
        # free (add_challenger enforces MAX_CHALLENGERS cap).
        import random as _random
        _rng = _random.Random(account_id * 9999 + int(time.time()) % 100000)
        sources = [
            ('mutation', _pl.source_random_mutation),
            ('ga', _pl.source_ga_mutation),
            ('llm', _pl.source_llm_proposal),
        ]
        def _quick_scorer(plan_dict):
            p = dict(base_plan)
            p.update({k: plan_dict[k] for k in (
                'strategies', 'combine_mode', 'take_profit_pct',
                'stop_loss_pct', 'pos_size_pct') if k in plan_dict})
            oos = score_plan_oos(p, target_annual, days, train_pct=0.7)
            if oos['n_folds'] == 0:
                return {'score': -1e9, 'annual_return_pct': 0.0}
            return {'score': oos['score'],
                    'annual_return_pct': oos['annual_return_pct']}
        for src_name, src_fn in sources:
            try:
                proposal = src_fn(plan, base_plan, _quick_scorer, _rng)
                if proposal:
                    _pl.add_challenger(account_id, proposal, source=src_name,
                                       conn_factory=_conn,
                                       note=f'{src_name}@{datetime.now().isoformat()[:19]}')
            except Exception as e:
                _log(account_id, 'warning',
                     f'challenger source {src_name} failed: {e}')

        # Build a scorer closure on the SAME purged OOS folds the baseline
        # and optimizer used (P4) — promotion comparisons stay apples-to-apples.
        def _score_challenger(plan_dict: Dict[str, Any]) -> Dict[str, Any]:
            p = dict(base_plan)
            p.update({k: plan_dict[k] for k in (
                'strategies', 'combine_mode', 'take_profit_pct',
                'stop_loss_pct', 'pos_size_pct') if k in plan_dict})
            oos = score_plan_oos(p, target_annual, days, train_pct=0.7)
            if oos['n_folds'] == 0:
                return {'score': -1e9, 'annual_return_pct': 0.0}
            return {'score': oos['score'],
                    'annual_return_pct': oos['annual_return_pct']}

        challenger_summary = _pl.evaluate_challengers(
            account_id, baseline_score, _score_challenger, _conn)
    except Exception as e:
        _log(account_id, 'warning', f'challenger eval skipped: {e}')
        challenger_summary = {'error': str(e)}

    applied = False
    after_plan = dict(plan)
    apply_source = None
    guardrail_result: Dict[str, Any] = {'passed': True, 'blocks': []}

    # Tentatively build the candidate `after_plan` (without applying it yet),
    # then run guardrails on it. We need the proposed plan before checking
    # GR3 (param-change ratio), so this two-phase structure is intentional.
    proposed_plan = dict(plan)
    proposed_source = None
    promoted = (challenger_summary or {}).get('promoted')
    if apply_if_better and promoted:
        try:
            from . import paper_learning as _pl
        except Exception:
            from web.modules import paper_learning as _pl  # type: ignore
        # Read the challenger's plan to score it for guardrails. Don't
        # promote yet — we want guardrails to decide.
        with _conn() as c:
            c.row_factory = sqlite3.Row
            row = c.execute(
                'SELECT plan_json FROM paper_challengers WHERE id=?',
                (promoted['id'],)).fetchone()
        if row:
            try:
                cand = json.loads(row['plan_json'])
                for k in ('strategies', 'combine_mode', 'take_profit_pct',
                          'stop_loss_pct', 'pos_size_pct'):
                    if k in cand:
                        proposed_plan[k] = cand[k]
                proposed_source = f"challenger_promoted:{promoted['source']}"
            except Exception:
                pass
    elif (apply_if_better
            and (best_score - baseline_score) >= _EVOLVE_MIN_GAIN
            and new_plan_fields):
        for k in ('strategies', 'combine_mode', 'take_profit_pct',
                 'stop_loss_pct', 'pos_size_pct'):
            if k in new_plan_fields and new_plan_fields[k] is not None:
                proposed_plan[k] = new_plan_fields[k]
        proposed_source = 'optimizer_direct'

    # T6.6 — guardrails. Run only if there's actually a proposed swap.
    if proposed_source:
        try:
            try:
                from . import paper_learning as _pl
            except Exception:
                from web.modules import paper_learning as _pl  # type: ignore
            backtest_max_dd = float(baseline_metrics.get('max_drawdown_pct') or 0)
            live_max_dd = (float(live.get('max_dd_pct'))
                           if live.get('applicable') else None)
            regime_flip = _pl.regime_just_flipped(_conn, window_days=_pl._GR_REGIME_WINDOW_DAYS)
            guardrail_result = _pl.evolution_guardrails(
                account_id=account_id,
                before_plan=plan,
                after_plan=proposed_plan,
                backtest_max_dd_pct=backtest_max_dd,
                live_max_dd_pct=live_max_dd,
                regime_recent_flip=regime_flip,
            )
        except Exception as e:
            _log(account_id, 'warning', f'guardrails check failed: {e}')
            guardrail_result = {'passed': True, 'blocks': [], 'note': f'check_failed: {e}'}

    if proposed_source and guardrail_result.get('passed'):
        after_plan = proposed_plan
        applied = True
        apply_source = proposed_source
        # If the apply path was a challenger promotion, do the actual
        # row swap now that guardrails passed.
        if promoted and apply_source and apply_source.startswith('challenger_promoted'):
            try:
                try:
                    from . import paper_learning as _pl
                except Exception:
                    from web.modules import paper_learning as _pl  # type: ignore
                _pl.promote_challenger(promoted['id'], account_id, _conn)
            except Exception as e:
                _log(account_id, 'warning', f'promote_challenger failed: {e}')
    elif proposed_source:
        # Blocked by guardrails — log + audit + alert
        applied = False
        apply_source = f"{proposed_source}_blocked_by_guardrails"
        block_reasons = ', '.join(guardrail_result.get('blocks') or [])
        _log(account_id, 'warning',
             f'evolution blocked by guardrails: {block_reasons}')
        _record_admin_action(account_id, user_id, 'evolution_blocked', {
            'source': proposed_source,
            'blocks': guardrail_result.get('blocks'),
            'before_plan': plan,
            'proposed_plan': proposed_plan,
        })
        try:
            from .notify import notify_admins
            notify_admins(
                f'⛔ Evolution blocked on account {account_id}',
                text=(f"Tried to swap to {proposed_source}. Guardrails fired: "
                      f"{block_reasons}. The plan was NOT changed. "
                      f"Inspect paper_admin_actions for details."),
            )
        except Exception:
            pass

    # Persist the round
    top_compact = []
    for t in (opt.get('top') or [])[:5]:
        top_compact.append({
            'strategies': t.get('plan', {}).get('strategies'),
            'combine_mode': t.get('plan', {}).get('combine_mode'),
            'take_profit_pct': t.get('plan', {}).get('take_profit_pct'),
            'stop_loss_pct': t.get('plan', {}).get('stop_loss_pct'),
            'pos_size_pct': t.get('plan', {}).get('pos_size_pct'),
            'score': t.get('score'),
            'annual_return_pct': t.get('annual_return_pct'),
            'hit_target': t.get('hit_target'),
            'metrics': t.get('metrics'),
        })

    note_bits = []
    if applied:
        if apply_source and apply_source.startswith('challenger_promoted'):
            note_bits.append(f"applied via {apply_source}")
        else:
            note_bits.append(f"applied (OOS score +{best_score - baseline_score:.2f})")
    else:
        note_bits.append(f"not applied (gain {best_score - baseline_score:.2f} < {_EVOLVE_MIN_GAIN})")
    note_bits.append(f"trials={opt.get('trials_count')}")
    if opt.get('hit_target_count'):
        note_bits.append(f"hit_target={opt['hit_target_count']}")
    if challenger_summary.get('evaluated'):
        note_bits.append(f"challengers={len(challenger_summary['evaluated'])}")
    note = ' · '.join(note_bits)

    now_iso = datetime.now().isoformat()
    with _conn() as c:
        c.execute('''INSERT INTO paper_account_evolutions
                     (account_id, trigger, before_plan_json, after_plan_json,
                      best_score, baseline_score, best_annual_pct, baseline_annual_pct,
                      trials_count, walk_forward, applied, top_json, note)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)''',
                  (account_id, trigger, json.dumps(plan), json.dumps(after_plan),
                   float(round(best_score, 3)), float(round(baseline_score, 3)),
                   float(round(best_annual, 3)), float(round(baseline_annual, 3)),
                   int(opt.get('trials_count') or 0),
                   1 if applied else 0, json.dumps(top_compact), note))
        if applied:
            c.execute('UPDATE paper_accounts SET plan_json=?, last_evolved_at=?, '
                      'live_score_last=? WHERE id=?',
                      (json.dumps(after_plan), now_iso,
                       float(live.get('score') or 0) if live.get('applicable') else None,
                       account_id))
        else:
            c.execute('UPDATE paper_accounts SET last_evolved_at=?, live_score_last=? WHERE id=?',
                      (now_iso,
                       float(live.get('score') or 0) if live.get('applicable') else None,
                       account_id))
        c.commit()
    # Metrics — counted regardless of apply outcome.
    try:
        from .observability import counter_inc
        counter_inc('paper_evolutions_total', trigger=trigger,
                    outcome='applied' if applied else 'not_applied')
        if applied:
            counter_inc('paper_promotions_total', trigger=trigger)
    except Exception:
        pass

    return {
        'success': True,
        'account_id': account_id,
        'applied': applied,
        'before': plan,
        'after': after_plan,
        'baseline': {
            'score': round(baseline_score, 3),
            'annual_return_pct': round(baseline_annual, 3),
            'metrics': baseline_metrics,
            'backtest_only_score': round(backtest_only_score, 3),
            'live': live,
            'live_weight_used': live_weight_used,
        },
        'best': {
            'score': round(best_score, 3),
            'annual_return_pct': round(best_annual, 3),
            'plan': new_plan_fields,
            'metrics': best.get('metrics'),
            'in_sample': best.get('in_sample'),
            'out_of_sample': best.get('out_of_sample'),
        },
        'top': top_compact,
        'trials_count': opt.get('trials_count'),
        'search_space': opt.get('search_space'),
        'challengers': challenger_summary,
        'apply_source': apply_source,
        'regime': regime,
        'guardrails': guardrail_result,
        'target_monthly_pct': target_monthly_pct,
        'target_annual_pct': target_annual,
        'note': note,
    }


def get_account_health(user_id: int, account_id: int,
                       include_symbol_health: bool = True) -> Dict[str, Any]:
    """Operational health snapshot for a single account.

    Surfaces the things that previously lived only in scattered log lines:
      - is a tick currently running? when did it start?
      - last_tick_error (the most recent crash message, if any)
      - last_run_date vs target_date staleness
      - open vs closed position counts
      - last admin action (reset/resume/close)

    A dashboard can poll this and show a yellow/red banner when something
    looks wrong — instead of the user needing to grep paper_trading.log.
    """
    init_paper_tables()
    today_iso = date.today().isoformat()
    with _conn() as c:
        a = c.execute('SELECT * FROM paper_accounts WHERE id=? AND user_id=?',
                      (account_id, user_id)).fetchone()
        if not a:
            return {'success': False, 'error': 'Account not found'}
        open_n = c.execute(
            "SELECT COUNT(*) AS n FROM paper_positions WHERE account_id=? AND status='open'",
            (account_id,)).fetchone()['n']
        closed_n = c.execute(
            "SELECT COUNT(*) AS n FROM paper_positions WHERE account_id=? AND status='closed'",
            (account_id,)).fetchone()['n']
        tx_today = c.execute(
            "SELECT COUNT(*) AS n FROM paper_transactions WHERE account_id=? AND ts_date=?",
            (account_id, today_iso)).fetchone()['n']
        last_admin = c.execute(
            'SELECT action, ts FROM paper_admin_actions WHERE account_id=? ORDER BY id DESC LIMIT 1',
            (account_id,)).fetchone()
    last_run = a['last_run_date']
    days_stale = None
    if last_run:
        try:
            days_stale = (date.fromisoformat(today_iso) - date.fromisoformat(last_run)).days
        except Exception:
            pass
    status_flags: List[str] = []
    if a['tick_running']:
        status_flags.append('tick_running')
    if a['last_tick_error']:
        status_flags.append('has_error')
    if days_stale is not None and days_stale > 3:
        status_flags.append('stale')
    if a['status'] != 'active':
        status_flags.append(a['status'])
    # Symbol health summary — pull only the unhealthy ones the account
    # currently holds or has in its plan, so the dashboard banner is signal
    # not noise.
    symbol_health: List[Dict[str, Any]] = []
    if include_symbol_health:
        try:
            plan = json.loads(a['plan_json'])
            plan_syms = set(plan.get('symbols') or [])
            plan_syms.update(plan.get('custom_symbols') or [])
            with _conn() as c:
                held = [r['symbol'] for r in c.execute(
                    "SELECT DISTINCT symbol FROM paper_positions WHERE account_id=? AND status='open'",
                    (account_id,)).fetchall()]
                plan_syms.update(held)
                if plan_syms:
                    placeholders = ','.join('?' * len(plan_syms))
                    rows = c.execute(
                        f"SELECT * FROM paper_symbol_health "
                        f"WHERE consecutive_failures > 0 AND symbol IN ({placeholders})",
                        tuple(plan_syms)).fetchall()
                    symbol_health = [dict(r) for r in rows]
        except Exception as e:
            _log(account_id, 'warning', f'symbol_health surface failed: {e}')
    if symbol_health:
        status_flags.append('symbol_health_issue')

    return {
        'success': True,
        'account_id': account_id,
        'status': a['status'],
        'tick_running': a['tick_running'],
        'last_tick_error': a['last_tick_error'],
        'last_run_date': last_run,
        'days_stale': days_stale,
        'open_positions': open_n,
        'closed_positions': closed_n,
        'transactions_today': tx_today,
        'last_evolved_at': a['last_evolved_at'] if 'last_evolved_at' in a.keys() else None,
        'last_admin_action': dict(last_admin) if last_admin else None,
        'paused_reason': a['paused_reason'],
        'status_flags': status_flags,
        'symbol_health': symbol_health,
    }


def list_account_evolutions(user_id: int, account_id: int,
                            limit: int = 20) -> Dict[str, Any]:
    init_paper_tables()
    with _conn() as c:
        a = c.execute('SELECT id FROM paper_accounts WHERE id=? AND user_id=?',
                      (account_id, user_id)).fetchone()
        if not a:
            return {'success': False, 'error': 'Account not found'}
        rows = c.execute(
            '''SELECT id, created_at, trigger, best_score, baseline_score,
                      best_annual_pct, baseline_annual_pct, trials_count,
                      applied, note, top_json, before_plan_json, after_plan_json
               FROM paper_account_evolutions WHERE account_id=?
               ORDER BY id DESC LIMIT ?''',
            (account_id, int(limit))).fetchall()
    out = []
    for r in rows:
        out.append({
            'id': r['id'], 'created_at': r['created_at'], 'trigger': r['trigger'],
            'best_score': r['best_score'], 'baseline_score': r['baseline_score'],
            'best_annual_pct': r['best_annual_pct'],
            'baseline_annual_pct': r['baseline_annual_pct'],
            'trials_count': r['trials_count'], 'applied': bool(r['applied']),
            'note': r['note'],
            'top': json.loads(r['top_json'] or '[]'),
            'before': json.loads(r['before_plan_json'] or '{}'),
            'after': json.loads(r['after_plan_json'] or '{}'),
        })
    return {'success': True, 'account_id': account_id, 'evolutions': out}


def _maybe_auto_evolve(user_id: int, account_id: int) -> None:
    """Called from run_account_tick. If the account opted into auto-evolve
    (evolve_frequency_days > 0) and enough time has passed since the last
    evolution, kick off one round in this thread. Best-effort — never raise."""
    try:
        with _conn() as c:
            a = c.execute(
                'SELECT evolve_frequency_days, last_evolved_at FROM paper_accounts WHERE id=? AND user_id=?',
                (account_id, user_id)).fetchone()
        if not a:
            return
        freq = int(a['evolve_frequency_days'] or 0)
        if freq <= 0:
            return
        last = a['last_evolved_at']
        if last:
            try:
                last_dt = datetime.fromisoformat(last)
                if (datetime.now() - last_dt).total_seconds() < freq * 86400:
                    return
            except Exception as e:
                _log(account_id, 'warning',
                     f'last_evolved_at parse failed ({last!r}) — re-evolving anyway: {e}')
        evolve_account_plan(user_id, account_id, trigger='auto')
    except Exception as e:
        import traceback
        _log(account_id, 'error',
             f'auto-evolve crashed: {e}\n{traceback.format_exc()}')


def resume_account(user_id: int, account_id: int,
                   reset_peak: bool = False) -> Dict[str, Any]:
    """Reactivate a paused account.

    Previously this zeroed peak_equity to current equity unconditionally, so a
    second drawdown from the same original high-water mark would not be
    detected — e.g. peak $20k → DD-stop at $12k → resume (peak becomes $12k)
    → rise to $15k → fall to $10.5k = 30% from original peak but only 30%
    from the new floor, *but* the stop fires only on `peak_equity` so the
    user thinks they're protected when they're not. From the audit:

        "Drawdown stop only tracks peak-to-current within a resume cycle.
         Multi-drawdown strategies can bypass overall loss limits."

    Fix: by default, preserve the original peak_equity on resume so the
    drawdown gate is still measured against the all-time high-water mark.
    Users who *want* a fresh slate pass `reset_peak=True`.
    """
    init_paper_tables()
    with _conn() as c:
        a = c.execute('SELECT * FROM paper_accounts WHERE id=? AND user_id=?',
                      (account_id, user_id)).fetchone()
        if not a:
            return {'success': False, 'error': 'Account not found'}
        if a['status'] == 'closed':
            return {'success': False, 'error': '已結束的帳戶無法重新啟用'}
        eq_row = c.execute(
            'SELECT equity FROM paper_equity_history WHERE account_id=? ORDER BY date DESC LIMIT 1',
            (account_id,)).fetchone()
        cur_equity = float(eq_row['equity']) if eq_row else float(a['cash'])
        old_peak = float(a['peak_equity'] or 0)
        if reset_peak:
            new_peak = cur_equity
        else:
            # Preserve the all-time high. If for some reason peak < current
            # (e.g. account was created with peak=initial and grew without
            # paused), let it ratchet up. Never silently regress the peak.
            new_peak = max(old_peak, cur_equity)
        c.execute(
            "UPDATE paper_accounts SET status='active', paused_reason=NULL, peak_equity=? WHERE id=?",
            (new_peak, account_id),
        )
        c.commit()
    _record_admin_action(account_id, user_id, 'resume', {
        'reset_peak': reset_peak,
        'old_peak_equity': old_peak,
        'new_peak_equity': new_peak,
        'current_equity': cur_equity,
    })
    _log(account_id, 'info',
         f'resumed (reset_peak={reset_peak} peak ${old_peak:.2f}→${new_peak:.2f} eq ${cur_equity:.2f})')
    return {'success': True, 'account_id': account_id,
            'old_peak_equity': old_peak,
            'new_peak_equity': new_peak,
            'reset_peak': reset_peak}


def build_daily_digest_for_user(user_id: int) -> Optional[Dict[str, Any]]:
    """
    Build a one-day P&L digest across all of a user's paper accounts.
    Returns None if user has no accounts.
    """
    init_paper_tables()
    today = date.today().isoformat()
    with _conn() as c:
        accts = c.execute(
            'SELECT * FROM paper_accounts WHERE user_id=? ORDER BY id',
            (user_id,),
        ).fetchall()
        if not accts:
            return None
        rows = []
        # Totals cannot meaningfully sum across currencies — group by ccy.
        by_ccy: Dict[str, Dict[str, float]] = {}
        new_tx_count = 0
        for r in accts:
            ccy = (r['base_currency'] if 'base_currency' in r.keys() and r['base_currency'] else 'USD')
            eq_today = c.execute(
                'SELECT cash, positions_value, equity FROM paper_equity_history WHERE account_id=? ORDER BY date DESC LIMIT 1',
                (r['id'],)).fetchone()
            equity = float(eq_today['equity']) if eq_today else float(r['initial_capital'])
            # P&L since yesterday
            yest_eq = c.execute(
                'SELECT equity FROM paper_equity_history WHERE account_id=? AND date < ? ORDER BY date DESC LIMIT 1',
                (r['id'], today),
            ).fetchone()
            day_pnl = (equity - float(yest_eq['equity'])) if yest_eq else 0.0
            day_tx = c.execute(
                'SELECT COUNT(*) AS n FROM paper_transactions WHERE account_id=? AND ts_date=?',
                (r['id'], today)).fetchone()['n']
            new_tx_count += day_tx
            roi = (equity / r['initial_capital'] - 1) * 100 if r['initial_capital'] else 0
            bucket = by_ccy.setdefault(ccy, {'equity': 0.0, 'initial': 0.0})
            bucket['equity'] += equity
            bucket['initial'] += float(r['initial_capital'])
            rows.append({
                'name': r['name'], 'status': r['status'],
                'equity': equity, 'day_pnl': day_pnl, 'day_tx': day_tx,
                'roi_pct': round(roi, 2),
                'base_currency': ccy,
            })
    totals_by_ccy = []
    for ccy, b in sorted(by_ccy.items()):
        roi_pct = (b['equity'] / b['initial'] - 1) * 100 if b['initial'] else 0
        totals_by_ccy.append({
            'currency': ccy,
            'total_equity': round(b['equity'], 2),
            'total_initial': round(b['initial'], 2),
            'total_roi_pct': round(roi_pct, 2),
        })
    # P6 — research-health block: experiment verdicts, ranker IC trend and
    # killed plays, so the forward-validation state reaches the user's inbox
    # instead of waiting to be polled on /api/experiments. Best-effort.
    research: Dict[str, Any] = {}
    try:
        try:
            from .ab_experiments import list_experiments
        except ImportError:
            from web.modules.ab_experiments import list_experiments  # type: ignore
        exps = [e for e in list_experiments(limit=20) if e['user_id'] == user_id]
        research['experiments'] = [{
            'name': e['name'], 'kind': e['kind'], 'status': e['status'],
            'elapsed_days': (e.get('verdict') or {}).get('elapsed_days'),
        } for e in exps]
    except Exception:
        pass
    try:
        try:
            from .ml_ranker import latest_metrics
        except ImportError:
            from web.modules.ml_ranker import latest_metrics  # type: ignore
        mets = [m for m in latest_metrics(limit=12)
                if not (m.get('note') or '').startswith('ablation')
                and (m.get('note') or '') != 'pick_churn']
        if mets:
            research['ranker_latest_ic'] = mets[0].get('rank_ic')
            ics = [m['rank_ic'] for m in mets if m.get('rank_ic') is not None]
            research['ranker_trailing_ic'] = (round(sum(ics) / len(ics), 4)
                                              if ics else None)
        # E4 — pick-churn observability (Jaccard of consecutive top-N).
        try:
            from .ml_ranker import latest_pick_churn
        except ImportError:
            from web.modules.ml_ranker import latest_pick_churn  # type: ignore
        research['pick_churn'] = latest_pick_churn()
    except Exception:
        pass
    try:
        try:
            from .options_playbook import disabled_plays
        except ImportError:
            from web.modules.options_playbook import disabled_plays  # type: ignore
        research['killed_plays'] = sorted(disabled_plays())
    except Exception:
        pass
    # E1 — dual-source earnings-calendar coverage over the straddle universe.
    try:
        try:
            from .earnings_calendar import coverage_stats
            from .options_playbook import _STRADDLE_UNIVERSE
        except ImportError:
            from web.modules.earnings_calendar import coverage_stats  # type: ignore
            from web.modules.options_playbook import _STRADDLE_UNIVERSE  # type: ignore
        research['earnings_calendar'] = coverage_stats(_STRADDLE_UNIVERSE)
    except Exception:
        pass
    # E2 — Jump Model shadow vs the live HMM gate.
    try:
        try:
            from .jump_regime import current_regime as _jm_cur, disagreement_rate
        except ImportError:
            from web.modules.jump_regime import (  # type: ignore
                current_regime as _jm_cur, disagreement_rate)
        _jm = _jm_cur()
        if _jm.get('regime') != 'unknown':
            research['regime_shadow'] = {
                'jm': _jm.get('regime'),
                'jm_bear_prob': (_jm.get('posterior') or {}).get('bear'),
                'disagree_30d': disagreement_rate(30),
            }
    except Exception:
        pass

    return {
        'date': today,
        'rows': rows,
        'totals_by_ccy': totals_by_ccy,
        'total_day_tx': new_tx_count,
        'research_health': research,
    }


def send_daily_digests() -> Dict[str, Any]:
    """Iterate every user with daily_digest=true and send them their digest."""
    init_paper_tables()
    try:
        from modules.notify import get_prefs, notify_user
    except Exception:
        from web.modules.notify import get_prefs, notify_user  # type: ignore
    sent = 0
    skipped = 0
    errors: List[str] = []
    with _conn() as c:
        users = [r[0] for r in c.execute(
            'SELECT DISTINCT user_id FROM paper_accounts WHERE status != "closed"').fetchall()]
    for uid in users:
        try:
            prefs = get_prefs(uid)
            if not prefs.get('daily_digest'):
                skipped += 1
                continue
            digest = build_daily_digest_for_user(uid)
            if not digest or not digest['rows']:
                skipped += 1
                continue

            def _ccy_sym(ccy: str) -> str:
                return 'HK$' if ccy == 'HKD' else ('$' if ccy == 'USD' else f'{ccy} ')

            rows_html = ''.join(
                (lambda sym=_ccy_sym(r.get('base_currency', 'USD')):
                 f"<tr><td style='padding:6px 10px;'>{r['name']}"
                 f" <span style='font-size:10px;color:#5b8dff;background:#eef2ff;padding:1px 6px;border-radius:4px;margin-left:4px;'>{r.get('base_currency','USD')}</span>"
                 f"</td>"
                 f"<td style='padding:6px 10px;text-align:right;'>{sym}{r['equity']:,.2f}</td>"
                 f"<td style='padding:6px 10px;text-align:right;color:{'#16a34a' if r['day_pnl']>=0 else '#dc2626'};'>"
                 f"{'+' if r['day_pnl']>=0 else ''}{sym}{r['day_pnl']:,.2f}</td>"
                 f"<td style='padding:6px 10px;text-align:right;color:{'#16a34a' if r['roi_pct']>=0 else '#dc2626'};font-weight:700;'>"
                 f"{'+' if r['roi_pct']>=0 else ''}{r['roi_pct']:.2f}%</td>"
                 f"<td style='padding:6px 10px;text-align:right;'>{r['day_tx']}</td>"
                 f"<td style='padding:6px 10px;font-size:11px;color:#888;'>{r['status']}</td></tr>"
                 )()
                for r in digest['rows']
            )

            # Per-currency totals (no cross-ccy summation — that would mix HKD and USD)
            totals_html = ''.join(
                (lambda t=t, sym=_ccy_sym(t['currency']):
                 (f"<div style='background:#f5f7fb;padding:12px;border-radius:6px;flex:1;min-width:160px;'>"
                  f"<div style='font-size:11px;color:#888;'>{t['currency']} 總資產</div>"
                  f"<div style='font-weight:800;font-size:18px;'>{sym}{t['total_equity']:,.2f}</div>"
                  f"<div style='font-size:11px;color:#888;margin-top:4px;'>"
                  f"投入 {sym}{t['total_initial']:,.2f} · "
                  f"<span style='color:{'#16a34a' if t['total_roi_pct']>=0 else '#dc2626'};font-weight:700;'>"
                  f"{'+' if t['total_roi_pct']>=0 else ''}{t['total_roi_pct']:.2f}%</span></div>"
                  f"</div>")
                 )()
                for t in digest.get('totals_by_ccy', [])
            )

            # P6 — research-health footer: running experiments, ranker IC,
            # killed plays. Compact; omitted entirely when there's no data.
            research_html = ''
            rh = digest.get('research_health') or {}
            rh_lines = []
            for e in (rh.get('experiments') or []):
                status_color = {'passed': '#16a34a', 'failed': '#dc2626',
                                'running': '#888'}.get(e['status'], '#888')
                el = e.get('elapsed_days')
                rh_lines.append(
                    f"<div style='font-size:12px;padding:2px 0;'>🧪 {e['name']} — "
                    f"<span style='color:{status_color};font-weight:700;'>{e['status']}</span>"
                    f"{f' ({el}d)' if el is not None else ''}</div>")
            if rh.get('ranker_trailing_ic') is not None:
                ic = rh['ranker_trailing_ic']
                ic_color = '#16a34a' if ic and ic > 0.03 else '#d97706'
                churn = rh.get('pick_churn')
                rh_lines.append(
                    f"<div style='font-size:12px;padding:2px 0;'>📐 ML 排序模型 trailing IC: "
                    f"<span style='color:{ic_color};font-weight:700;'>{ic:.4f}</span>"
                    f" (門檻 0.03)"
                    + (f" · 選股換手 {churn:.0%}/日" if churn is not None else '')
                    + "</div>")
            if rh.get('killed_plays'):
                rh_lines.append(
                    f"<div style='font-size:12px;padding:2px 0;color:#dc2626;'>"
                    f"☠️ 已停用策略: {', '.join(rh['killed_plays'])}</div>")
            rs = rh.get('regime_shadow') or {}
            if rs.get('jm'):
                dis = rs.get('disagree_30d')
                rh_lines.append(
                    f"<div style='font-size:12px;padding:2px 0;'>🌀 跳躍模型(影子): "
                    f"{rs['jm']} (bear {rs.get('jm_bear_prob', 0):.2f})"
                    + (f" · 與 HMM 分歧率 {dis:.0%}/30d" if dis is not None else '')
                    + "</div>")
            ec = rh.get('earnings_calendar') or {}
            if ec.get('checked_frac') is not None:
                cf = ec['checked_frac']
                ec_color = '#16a34a' if cf >= 0.6 else '#dc2626'
                cf_conf = ec.get('confirmed_frac')
                rh_lines.append(
                    f"<div style='font-size:12px;padding:2px 0;'>📅 財報日曆覆蓋: "
                    f"<span style='color:{ec_color};font-weight:700;'>{cf:.0%}</span>"
                    + (f" · 雙源確認 {cf_conf:.0%}" if cf_conf is not None else '')
                    + f" · {ec.get('upcoming_events', 0)} 件將至</div>")
            if rh_lines:
                research_html = (
                    "<div style='margin-top:16px;padding:12px;background:#f5f7fb;"
                    "border-radius:6px;'>"
                    "<div style='font-size:11px;color:#888;margin-bottom:6px;'>"
                    "前瞻驗證 / 模型健康</div>" + ''.join(rh_lines) + "</div>")

            html = f"""<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#f5f7fb;margin:0;padding:20px;">
<div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <h2 style="margin:0 0 8px;color:#1a223a;">📊 每日模擬交易摘要 — {digest['date']}</h2>
  <p style="color:#666;font-size:13px;margin:0 0 16px;">{len(digest['rows'])} 個帳戶 · 今日 {digest['total_day_tx']} 筆交易</p>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">{totals_html}</div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e5e7eb;">
    <thead style="background:#f5f7fb;color:#666;"><tr>
      <th style="padding:6px 10px;text-align:left;">帳戶</th><th style="padding:6px 10px;text-align:right;">資產</th>
      <th style="padding:6px 10px;text-align:right;">今日 P&L</th><th style="padding:6px 10px;text-align:right;">ROI</th>
      <th style="padding:6px 10px;text-align:right;">交易</th><th style="padding:6px 10px;">狀態</th>
    </tr></thead>
    <tbody>{rows_html}</tbody>
  </table>
  {research_html}
</div></body></html>"""
            totals_summary = ', '.join(
                f"{t['currency']} {_ccy_sym(t['currency'])}{t['total_equity']:,.2f} ({'+' if t['total_roi_pct']>=0 else ''}{t['total_roi_pct']:.2f}%)"
                for t in digest.get('totals_by_ccy', [])
            ) or '—'
            text = (f"📊 每日摘要 {digest['date']}: {totals_summary}; "
                    f"{digest['total_day_tx']} 筆今日交易, {len(digest['rows'])} 帳戶")
            res = notify_user(
                uid,
                f"📊 每日模擬交易摘要 {digest['date']}",
                html=html, text=text,
                channels={'paper_tick_email': True, 'paper_tick_slack': True, 'paper_tick_telegram': True},
            )
            if any(res.values()):
                sent += 1
            else:
                skipped += 1
        except Exception as e:
            errors.append(f"user {uid}: {e}")
    return {'sent': sent, 'skipped': skipped, 'errors': errors[:10]}


def send_weekly_leaderboards() -> Dict[str, Any]:
    """For each user with daily_digest enabled who has 2+ saved universes,
    run the optimizer briefly on each universe and email a leaderboard.
    Heavy-ish — runs once a week (Sunday after 22:00) by the scheduler."""
    init_paper_tables()
    try:
        from modules.notify import get_prefs, notify_user
        from modules.user_universes import list_universes
        from modules.autotrade_sim import optimize_plan
    except Exception as ie:
        return {'sent': 0, 'errors': [f'import: {ie}']}

    sent = 0
    skipped = 0
    errors: List[str] = []
    with _conn() as c:
        users = [r[0] for r in c.execute(
            'SELECT DISTINCT user_id FROM user_universes').fetchall()]
    for uid in users:
        try:
            prefs = get_prefs(uid)
            if not prefs.get('daily_digest'):
                skipped += 1
                continue
            lst = list_universes(uid)
            if not lst.get('success') or len(lst['universes']) < 2:
                skipped += 1
                continue

            results: List[Dict[str, Any]] = []
            for u in lst['universes']:
                if not u['symbols']:
                    continue
                base = {
                    'symbols': ','.join(u['symbols'][:30]),  # cap for time
                    'capital': 10000, 'period': '1y', 'pos_size_pct': 20,
                }
                try:
                    res = optimize_plan(base, target_monthly_pct=3.0,
                                       max_iterations=20, walk_forward=False)
                    if res.get('success') and res.get('best'):
                        b = res['best']
                        results.append({
                            'name': u['name'],
                            'count': u['count'],
                            'annual_return_pct': b.get('annual_return_pct', 0),
                            'win_rate': b.get('metrics', {}).get('win_rate', 0),
                            'max_dd': b.get('metrics', {}).get('max_drawdown_pct', 0),
                            'sharpe': b.get('metrics', {}).get('sharpe', 0),
                            'best_strats': b.get('plan', {}).get('strategies', []),
                        })
                except Exception as e:
                    _log(None, 'warning',
                         f'leaderboard opt failed for user {uid} \'{u["name"]}\': {e}')

            if not results:
                skipped += 1
                continue
            results.sort(key=lambda r: -r['annual_return_pct'])

            rows_html = ''.join(
                f"<tr><td style='padding:6px 10px;font-weight:700;color:#555;'>{i+1}</td>"
                f"<td style='padding:6px 10px;font-weight:700;'>{r['name']}</td>"
                f"<td style='padding:6px 10px;color:#888;'>{r['count']}</td>"
                f"<td style='padding:6px 10px;text-align:right;font-weight:700;color:{'#16a34a' if r['annual_return_pct']>=0 else '#dc2626'};'>"
                f"{'+' if r['annual_return_pct']>=0 else ''}{r['annual_return_pct']:.1f}%</td>"
                f"<td style='padding:6px 10px;text-align:right;'>{r['win_rate']:.0f}%</td>"
                f"<td style='padding:6px 10px;text-align:right;color:#dc2626;'>-{r['max_dd']:.1f}%</td>"
                f"<td style='padding:6px 10px;text-align:right;'>{r['sharpe']:.2f}</td>"
                f"<td style='padding:6px 10px;font-size:11px;color:#888;'>{'+'.join(r['best_strats'][:3])}</td></tr>"
                for i, r in enumerate(results)
            )
            html = f"""<!DOCTYPE html><html><body style='font-family:Inter,sans-serif;background:#f5f7fb;margin:0;padding:20px;'>
<div style='max-width:720px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08);'>
  <h2 style='margin:0 0 8px;color:#1a223a;'>🏆 每週自訂池排行榜</h2>
  <p style='color:#666;font-size:13px;margin:0 0 14px;'>系統對您的 {len(results)} 個自訂池跑了 1 年回測 + 自我改進，按年化排序。</p>
  <table style='width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e5e7eb;'>
    <thead style='background:#f5f7fb;color:#666;'><tr>
      <th style='padding:6px 10px;text-align:left;'>#</th><th style='padding:6px 10px;text-align:left;'>列表</th>
      <th style='padding:6px 10px;text-align:left;'>檔數</th><th style='padding:6px 10px;text-align:right;'>年化</th>
      <th style='padding:6px 10px;text-align:right;'>勝率</th><th style='padding:6px 10px;text-align:right;'>最大回撤</th>
      <th style='padding:6px 10px;text-align:right;'>夏普</th><th style='padding:6px 10px;text-align:left;'>最佳策略</th>
    </tr></thead><tbody>{rows_html}</tbody></table>
  <p style='color:#888;font-size:11px;margin-top:14px;'>⚠️ 結果為 1 年回測，僅供參考 — 過去績效不代表未來表現。</p>
</div></body></html>"""
            text = f"🏆 每週排行榜: {results[0]['name']} 第一 ({results[0]['annual_return_pct']:+.1f}% 年化), 總共 {len(results)} 個列表"
            res = notify_user(uid, '🏆 每週自訂池排行榜', html=html, text=text,
                              channels={'paper_tick_email': True, 'paper_tick_slack': True, 'paper_tick_telegram': True})
            if any(res.values()):
                sent += 1
            else:
                skipped += 1
        except Exception as e:
            errors.append(f'user {uid}: {e}')
    return {'sent': sent, 'skipped': skipped, 'errors': errors[:10]}


def admin_overview() -> Dict[str, Any]:
    """Cross-user paper-trading stats. Caller must verify admin auth before use."""
    init_paper_tables()
    today = date.today().isoformat()
    with _conn() as c:
        # Counts by status
        total = c.execute('SELECT COUNT(*) AS n FROM paper_accounts').fetchone()['n']
        active = c.execute("SELECT COUNT(*) AS n FROM paper_accounts WHERE status='active'").fetchone()['n']
        paused = c.execute("SELECT COUNT(*) AS n FROM paper_accounts WHERE status='paused_drawdown'").fetchone()['n']
        closed = c.execute("SELECT COUNT(*) AS n FROM paper_accounts WHERE status='closed'").fetchone()['n']
        auto_run = c.execute("SELECT COUNT(*) AS n FROM paper_accounts WHERE auto_run=1 AND status='active'").fetchone()['n']
        # Aggregate AUM (sum of latest equity per account)
        aum_rows = c.execute('''
            SELECT a.id, a.name, a.user_id, a.status, a.initial_capital,
                   (SELECT email FROM users u WHERE u.id=a.user_id) AS email,
                   (SELECT equity FROM paper_equity_history e WHERE e.account_id=a.id ORDER BY date DESC LIMIT 1) AS equity
            FROM paper_accounts a
            ORDER BY equity DESC NULLS LAST
            LIMIT 20
        ''').fetchall()
        # The above NULLS LAST may not be supported in old SQLite — fallback safe sort in Python
        leaderboard = []
        total_aum = 0.0
        for r in aum_rows:
            eq = r['equity'] if r['equity'] is not None else r['initial_capital']
            roi = (eq / r['initial_capital'] - 1) * 100 if r['initial_capital'] else 0
            total_aum += float(eq or 0)
            leaderboard.append({
                'account_id': r['id'], 'name': r['name'], 'email': r['email'],
                'status': r['status'], 'initial_capital': r['initial_capital'],
                'equity': eq, 'roi_pct': round(roi, 2),
            })
        leaderboard.sort(key=lambda x: -(x['roi_pct'] or 0))

        # Today's tx count + recent paused accounts
        today_tx = c.execute(
            'SELECT COUNT(*) AS n FROM paper_transactions WHERE ts_date=?', (today,)
        ).fetchone()['n']
        recent_paused = [dict(r) for r in c.execute('''
            SELECT a.id, a.name, a.user_id, a.paused_reason, a.last_run_date,
                   (SELECT email FROM users u WHERE u.id=a.user_id) AS email
            FROM paper_accounts a
            WHERE a.status='paused_drawdown'
            ORDER BY a.last_run_date DESC LIMIT 10
        ''').fetchall()]

        # Total transactions ever
        total_tx = c.execute('SELECT COUNT(*) AS n FROM paper_transactions').fetchone()['n']

    return {
        'success': True,
        'as_of': today,
        'totals': {
            'accounts': total, 'active': active, 'paused': paused, 'closed': closed,
            'auto_run_active': auto_run, 'aum_top20': round(total_aum, 2),
            'transactions_today': today_tx, 'transactions_total': total_tx,
        },
        'leaderboard': leaderboard,
        'recent_paused': recent_paused,
    }


def list_auto_run_accounts() -> List[Dict[str, Any]]:
    """Return active accounts with auto_run=1 that haven't been ticked today.
    Used by the nightly scheduler thread.
    """
    init_paper_tables()
    today = date.today().isoformat()
    with _conn() as c:
        rows = c.execute(
            '''SELECT id, user_id FROM paper_accounts
               WHERE status='active' AND auto_run=1
               AND (last_run_date IS NULL OR last_run_date < ?)''',
            (today,),
        ).fetchall()
    return [{'id': r['id'], 'user_id': r['user_id']} for r in rows]


def close_account(user_id: int, account_id: int) -> Dict[str, Any]:
    """Close all open positions at last cached close, mark account closed."""
    init_paper_tables()
    with _conn() as c:
        a = c.execute('SELECT * FROM paper_accounts WHERE id=? AND user_id=?',
                      (account_id, user_id)).fetchone()
        if not a:
            return {'success': False, 'error': 'Account not found'}
        _plan_c = json.loads(a['plan_json'])

    # Options-follow accounts liquidate their option positions (return locked
    # collateral + MTM to cash) via the dedicated engine.
    if (_plan_c.get('ai_mode') or '').lower() == 'options_follow':
        try:
            from .paper_options_follow import close_all_open
        except ImportError:
            from web.modules.paper_options_follow import close_all_open  # type: ignore
        res = close_all_open(user_id, account_id)
        if res.get('success'):
            _record_admin_action(account_id, user_id, 'close', {
                'positions_liquidated': res.get('positions_liquidated', 0),
                'final_cash': res.get('final_cash'),
            })
            _log(account_id, 'info',
                 f"closed options-follow (liquidated {res.get('positions_liquidated', 0)} "
                 f"positions, final cash ${res.get('final_cash', 0):.2f})")
        return res

    with _conn() as c:
        open_rows = c.execute(
            "SELECT * FROM paper_positions WHERE account_id=? AND status='open'",
            (account_id,)).fetchall()
        cash = a['cash']
        today = date.today().isoformat()
        account_ccy = (a['base_currency'] if 'base_currency' in a.keys() and a['base_currency'] else 'USD')
        for p in open_rows:
            data = _fetch(p['symbol'], '1mo')
            if not data:
                continue
            _, closes, _, _ = data
            sym_ccy = _symbol_currency(p['symbol'])
            if sym_ccy != account_ccy and closes:
                closes = _convert_series(closes, sym_ccy, account_ccy)
            last = closes[-1] if closes else p['entry_price']
            sell_bps = _fee_bps(p['symbol'], 'sell')
            proceeds = p['shares'] * last * (1 - sell_bps)
            pnl_abs = proceeds - p['shares'] * p['entry_price']
            pnl_pct = ((last / p['entry_price']) - 1) * 100 if p['entry_price'] else 0
            cash += proceeds
            c.execute('''UPDATE paper_positions SET status='closed',
                         exit_price=?, exit_date=?, exit_reason='account_closed',
                         pnl_abs=?, pnl_pct=? WHERE id=?''',
                      (float(last), today, float(pnl_abs), float(pnl_pct), p['id']))
            c.execute('''INSERT INTO paper_transactions
                         (account_id, position_id, type, symbol, shares, price, value, fee, cash_after, reason, ts_date)
                         VALUES (?, ?, 'sell', ?, ?, ?, ?, ?, ?, 'account_closed', ?)''',
                      (account_id, p['id'], p['symbol'], p['shares'],
                       float(last), float(p['shares'] * last),
                       float(p['shares'] * last * sell_bps), float(cash), today))

        c.execute("UPDATE paper_accounts SET status='closed', cash=? WHERE id=?",
                  (cash, account_id))
        c.execute(
            'INSERT OR REPLACE INTO paper_equity_history (account_id, date, cash, positions_value, equity) VALUES (?, ?, ?, ?, ?)',
            (account_id, today, cash, 0.0, cash),
        )
        c.commit()
    _record_admin_action(account_id, user_id, 'close', {
        'positions_liquidated': len(open_rows),
        'final_cash': cash,
    })
    _log(account_id, 'info', f'closed (liquidated {len(open_rows)} positions, final cash ${cash:.2f})')
    return {'success': True, 'account_id': account_id, 'final_cash': cash,
            'positions_liquidated': len(open_rows)}


# ---------------------------------------------------------------------------
# Daily tick — the heart of the paper-trader
# ---------------------------------------------------------------------------
def _last_known_close(s: Dict[str, Any], d_iso: str) -> Optional[float]:
    """Return the most recent close on a date <= d_iso. None if the series has
    no bar on or before that date.

    The tick loop iterates the UNION of all symbols' trading days, so for any
    given d a particular symbol may not have a bar (cache miss, late close, a
    holiday on its venue but not on another's). Previously we silently zeroed
    those positions — that fake-crashes the equity snapshot and trips the
    drawdown stop. Carrying the last known close preserves correctness across
    venue-calendar mismatches and short feed outages.
    """
    idx_by_date = s.get('idx_by_date') or {}
    if d_iso in idx_by_date:
        return float(s['closes'][idx_by_date[d_iso]])
    dates = s.get('dates') or []
    if not dates:
        return None
    import bisect
    i = bisect.bisect_right(dates, d_iso) - 1
    if i < 0:
        return None
    return float(s['closes'][i])


def _signals_for(symbol: str, plan: Dict[str, Any], account_ccy: str = 'USD'):
    """Return aligned (dates, closes, highs, lows, signals) for a symbol,
    with prices converted into the account's base currency.

    Side effects (Track 3):
      - Updates paper_symbol_health on success/failure so persistently
        dead tickers can be surfaced via /api/paper/health.
      - Logs gap-warnings when the date sequence has a halt-sized hole.
    """
    data = _fetch(symbol, '1y')
    if not data:
        n = _record_symbol_failure(symbol, 'yfinance returned no data')
        if n >= _SYMBOL_DISABLE_THRESHOLD:
            _log(None, 'error',
                 f'symbol {symbol} has failed {n} consecutive fetches — likely delisted')
        return None
    dates, closes, highs, lows = data
    if len(closes) < 60:
        _record_symbol_failure(symbol, f'history<60 bars (got {len(closes)})')
        return None
    # Halt/gap detection — log only; the indicator math will still compute,
    # but the operator now knows a synthetic crossover is possible.
    gaps = detect_gaps(dates)
    if gaps:
        worst = max(gaps, key=lambda g: g[1])
        _log(None, 'warning',
             f'{symbol} OHLCV has {len(gaps)} gap(s); largest = {worst[1]} days '
             f'at index {worst[0]} (possible halt/relisting → spurious signals risk)')
    sym_ccy = _symbol_currency(symbol)
    if sym_ccy != account_ccy:
        closes = _convert_series(closes, sym_ccy, account_ccy)
        highs = _convert_series(highs, sym_ccy, account_ccy)
        lows = _convert_series(lows, sym_ccy, account_ccy)
    sigs = _combine_signals(plan['strategies'], plan.get('combine_mode', 'any'),
                            closes, highs, lows)
    exit_sigs = _build_exit_signals(plan['strategies'], plan.get('combine_mode', 'any'),
                                    closes, highs, lows)
    _record_symbol_success(symbol)
    return dates, closes, highs, lows, sigs, exit_sigs


def run_account_tick(user_id: int, account_id: int,
                     until_date: Optional[str] = None) -> Dict[str, Any]:
    """Public entrypoint — wraps the implementation in a race-safe lock and an
    error envelope. On any exception below this layer:

      1. Stack trace is logged to web/logs/paper_trading.log
      2. last_tick_error column is populated for the dashboard
      3. The user is notified (best-effort) via notify_user
      4. The tick lock is released so the next call can retry

    The implementation itself (_run_account_tick_impl) is unchanged in
    behaviour and remains a pure replay-from-last_run_date function.
    """
    init_paper_tables()
    _tick_t0 = time.time()
    try:
        from .observability import counter_inc, histogram_observe
    except Exception:
        try:
            from web.modules.observability import counter_inc, histogram_observe  # type: ignore
        except Exception:
            counter_inc = histogram_observe = lambda *a, **kw: None  # type: ignore
    if not _claim_tick(account_id):
        _log(account_id, 'warning',
             'tick rejected — another tick is already running for this account')
        counter_inc('paper_ticks_total', outcome='rejected_locked')
        return {'success': False, 'error': 'tick already running for this account',
                'account_id': account_id}
    err: Optional[str] = None
    try:
        # Clear any leftover FX-stale records before the tick so we measure
        # only the FX rates this tick relied on.
        _drain_fx_stale()
        result = _run_account_tick_impl(user_id, account_id, until_date)
        stale_fx = _drain_fx_stale()
        if stale_fx:
            # Dedupe while preserving insertion order
            seen = {}
            for pair, src in stale_fx:
                seen[pair] = src
            stale_summary = ' '.join(f'{p}={s}' for p, s in seen.items())
            _log(account_id, 'warning',
                 f'tick used synthetic FX rates: {stale_summary} — account valuations '
                 f'may be ±3% off until the FX feed recovers')
            result.setdefault('warnings', []).append({
                'kind': 'fx_stale', 'pairs': seen,
            })
        # Persist a brief tick summary to the log for forensics.
        if result.get('success'):
            _log(account_id, 'info',
                 'tick done',
                 days=result.get('days_processed'),
                 new_tx=result.get('new_transactions'),
                 last_run=result.get('last_run_date'),
                 paused=bool(result.get('paused')))
            counter_inc('paper_ticks_total',
                        outcome='paused' if result.get('paused') else 'ok')
        else:
            _log(account_id, 'warning', f"tick returned not-success: {result.get('error')}")
            counter_inc('paper_ticks_total', outcome='not_success')
            counter_inc('paper_errors_total', source='tick_not_success')
        histogram_observe('paper_tick_duration_seconds', time.time() - _tick_t0)
        return result
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        err = f"{type(e).__name__}: {e}"
        _log(account_id, 'error', f'tick CRASHED: {err}\n{tb}')
        counter_inc('paper_ticks_total', outcome='crashed')
        counter_inc('paper_errors_total', source='tick_crash')
        # Best-effort alert so the user knows the account stopped trading.
        # HOTFIX: gated by _notifications_safe() to prevent test runs from
        # spamming the real prod user when the test fixture monkeypatched
        # _DB but the notify module still reads the real prod DB. Set
        # PAPER_TRADING_MUTE_NOTIFY=1 to disable globally.
        if _notifications_safe():
            try:
                from modules.notify import notify_user  # type: ignore
            except Exception:
                try:
                    from web.modules.notify import notify_user  # type: ignore
                except Exception:
                    notify_user = None  # type: ignore
            if notify_user:
                try:
                    notify_user(
                        user_id,
                        f"⚠️ Paper tick failed for account {account_id}",
                        text=(f"Auto-trade tick crashed: {err}\n"
                              f"The account will keep retrying on the next scheduler "
                              f"cycle. Check web/logs/paper_trading.log for the full "
                              f"stack trace, or call /api/paper/health for diagnostics."),
                    )
                except Exception as ne:
                    _log(account_id, 'warning', f'failed to alert user on tick crash: {ne}')
        else:
            _log(account_id, 'info', 'tick crash notify suppressed (non-prod DB or env-muted)')
        return {'success': False, 'error': err, 'account_id': account_id}
    finally:
        _release_tick(account_id, error=err)


def _run_account_tick_impl(user_id: int, account_id: int,
                           until_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Replay the strategy day-by-day from (last_run_date+1) to until_date (or today).
    Records every buy/sell, updates equity history, returns a summary.

    Idempotent — if last_run_date == until_date, nothing happens.
    Uses cached daily OHLCV data; on weekends/holidays, simply skips dates with no bar.
    """
    init_paper_tables()
    today_iso = date.today().isoformat()
    target_iso = until_date or today_iso

    # Non-fatal warnings the tick accumulates and returns in the result.
    # Used by the wrapper / dashboard / email digest to flag degraded runs
    # without forcing a failure return.
    tick_warnings: List[Dict[str, Any]] = []

    # Options-follow accounts run a separate engine (settle expiries → MTM →
    # open today's AI option recs) with no share-based day-by-day replay.
    # Dispatch here, still inside the tick lock + error envelope.
    with _conn() as _c0:
        _a0 = _c0.execute(
            'SELECT plan_json FROM paper_accounts WHERE id=? AND user_id=?',
            (account_id, user_id)).fetchone()
    if _a0:
        try:
            _plan0 = json.loads(_a0['plan_json'])
        except Exception:
            _plan0 = {}
        if (_plan0.get('ai_mode') or '').lower() == 'options_follow':
            try:
                from .paper_options_follow import run_follow_tick_impl
            except ImportError:
                from web.modules.paper_options_follow import run_follow_tick_impl  # type: ignore
            return run_follow_tick_impl(user_id, account_id, target_iso, tick_warnings)

    with _conn() as c:
        a = c.execute('SELECT * FROM paper_accounts WHERE id=? AND user_id=?',
                      (account_id, user_id)).fetchone()
        if not a:
            return {'success': False, 'error': 'Account not found'}
        if a['status'] != 'active':
            return {'success': False, 'error': 'Account is not active'}

        plan = json.loads(a['plan_json'])
        ai_mode = (plan.get('ai_mode') or 'manual')
        universe = plan.get('universe') or 'sp500_top50'
        ai_pick_count = int(plan.get('ai_pick_count') or 5)
        manual_symbols: List[str] = plan.get('symbols') or []

        if ai_mode == 'ai_picks':
            # Today's AI-ranked top BUYs become the trading universe.
            # We keep currently-held symbols in the list so they can still exit normally.
            try:
                from modules.ai_picks import top_long_symbols
            except Exception:
                from web.modules.ai_picks import top_long_symbols  # type: ignore
            custom_syms = plan.get('custom_symbols') or []
            news_filter = bool(plan.get('llm_news_filter'))
            news_mode = plan.get('news_filter_mode') or 'lexicon'
            # P1c — selection source. 'ml_ranker' uses the LightGBM
            # learning-to-rank cross-section; anything else (or a stale/
            # missing model) lands on the heuristic scan.
            pick_source = (plan.get('pick_source') or 'heuristic').lower()
            try:
                ai_syms = top_long_symbols(universe, top_n=ai_pick_count,
                                           custom_symbols=custom_syms,
                                           news_filter=news_filter,
                                           news_filter_mode=news_mode,
                                           pick_source=pick_source)
                if not ai_syms:
                    # Scan returned empty but didn't raise — still
                    # degraded, will fall back to manual symbols.
                    tick_warnings.append({
                        'kind': 'ai_scan_empty',
                        'detail': 'AI universe scan returned 0 picks; '
                                  'falling back to plan.symbols',
                    })
                    _log(account_id, 'warning',
                         'AI scan returned empty result — fallback to manual symbols')
            except Exception as e:
                _log(account_id, 'error', f'AI scan failed: {e}')
                tick_warnings.append({
                    'kind': 'ai_scan_failed',
                    'detail': f'{type(e).__name__}: {e}',
                })
                ai_syms = []
            # Add open positions so we can exit them
            held = [r['symbol'] for r in c.execute(
                "SELECT DISTINCT symbol FROM paper_positions WHERE account_id=? AND status='open'",
                (account_id,)).fetchall()]
            symbols: List[str] = sorted(set(ai_syms + held))
            if not symbols:
                # Fallback to manual list if scan came back empty
                symbols = manual_symbols
        else:
            symbols = manual_symbols
        pos_pct = float(plan.get('pos_size_pct') or 20) / 100.0
        tp = float(plan.get('take_profit_pct') or 0) / 100.0
        sl = float(plan.get('stop_loss_pct') or 0) / 100.0
        atr_stop_mult = float(plan.get('atr_stop_mult') or 0)
        trailing_stop_pct = float(plan.get('trailing_stop_pct') or 0) / 100.0
        # T17D — profit-taking exit ladder
        ladder_pcts: List[float] = list(plan.get('profit_ladder_pct') or [])
        ladder_trim: List[float] = list(plan.get('ladder_trim_fractions') or [])
        # Length-align in case the plan was edited inconsistently
        ladder_steps = min(len(ladder_pcts), len(ladder_trim))
        max_per_name_pct = float(plan.get('max_per_name_pct') or 25) / 100.0
        vix_gate = float(plan.get('vix_gate_threshold') or 0)
        mtf_gate = bool(plan.get('mtf_gate'))
        vol_target = float(plan.get('vol_target_annual_pct') or 0) / 100.0  # 0 = use fixed pos_pct
        # New anti-churn + sizing-hygiene knobs (Track 2).
        hold_cooldown_days = int(plan.get('hold_cooldown_days', _DEFAULT_HOLD_COOLDOWN_DAYS))
        min_trade_value = float(plan.get('min_trade_value') or _DEFAULT_MIN_TRADE_VALUE)
        # P1a — fill timing. 'next_close' lags the entry/soft-exit signal one
        # bar (decide on yesterday's close, fill at today's close) so a bar
        # can't trigger a fill priced off its own close. Accounts created
        # before the field existed default to legacy 'same_close' so their
        # already-recorded replay history stays reproducible. Must stay in
        # lockstep with autotrade_sim._simulate_symbol (engine parity).
        fill_mode = (plan.get('fill_mode') or 'same_close').lower()
        sig_lag = 1 if fill_mode == 'next_close' else 0
        # P2 — uncertainty-gated sizing for ranker-driven accounts: when the
        # ml_ranker's trailing out-of-sample IC degrades or its score
        # dispersion collapses, shrink every new position (gate in [0.3, 1])
        # instead of second-guessing individual picks. Fetched once per tick.
        size_gate = 1.0
        if (plan.get('pick_source') or '').lower() == 'ml_ranker':
            try:
                try:
                    from .ml_ranker import confidence_state
                except ImportError:
                    from web.modules.ml_ranker import confidence_state  # type: ignore
                _cs = confidence_state()
                size_gate = float(_cs.get('gate', 1.0))
                if size_gate < 1.0:
                    _log(account_id, 'info',
                         f'ranker confidence gate {size_gate:.2f}: {_cs.get("reason")}')
            except Exception:
                size_gate = 1.0
        # Sector concentration cap (Track 4 / audit #11). 0 = disabled.
        max_per_sector_pct = float(plan.get('max_per_sector_pct') or 0) / 100.0
        # T15 VWAP-distance gate. Defaults: don't chase >3% above 20d VWAP,
        # don't catch falling-knife >8% below. 0 disables either side.
        vwap_chase_max_pct = float(plan.get('vwap_chase_max_pct', 3.0))
        vwap_undercut_max_pct = float(plan.get('vwap_undercut_max_pct', 8.0))
        vwap_window = int(plan.get('vwap_window', 20))
        # Pre-resolve sectors for everything in the universe so the entry
        # loop doesn't pay per-symbol yfinance latency. allow_network=True
        # but cached after first fetch.
        sector_by_symbol: Dict[str, Optional[str]] = {}
        if max_per_sector_pct > 0:
            for sym in symbols:
                try:
                    sector_by_symbol[sym] = _symbol_sector(sym, allow_network=True)
                except Exception:
                    sector_by_symbol[sym] = None

        # VIX regime gate: skip new entries this whole tick if VIX above threshold.
        # Existing positions still tick (exits, equity) — only new buys are paused.
        vix_block_entries = False
        if vix_gate > 0:
            vix = _vix_latest()
            if vix is not None and vix > vix_gate:
                vix_block_entries = True
                _log(account_id, 'info',
                     f'VIX gate tripped: VIX={vix:.1f} > {vix_gate} — pausing new entries')

        # T18C — HMM regime gate. Suppress new long entries when the
        # 2-state Gaussian HMM posterior on SPY puts the bear state above
        # 70%. Independent of VIX (different signal): VIX measures spot
        # fear; HMM measures the persistent regime.
        if bool(plan.get('use_hmm_regime', True)) and not vix_block_entries:
            try:
                # E2 — regime engine selection. use_jump_regime is read with a
                # plain falsy default (unlike use_hmm_regime's default-True):
                # the Jump Model runs in SHADOW until an account/experiment
                # explicitly opts in, so no existing plan can be affected.
                if bool(plan.get('use_jump_regime')):
                    try:
                        from .jump_regime import is_bear, current_regime  # type: ignore
                    except ImportError:
                        from web.modules.jump_regime import is_bear, current_regime  # type: ignore
                    gate_name = 'JM'
                else:
                    try:
                        from .hmm_regime import is_bear, current_regime  # type: ignore
                    except ImportError:
                        from web.modules.hmm_regime import is_bear, current_regime  # type: ignore
                    gate_name = 'HMM'
                if is_bear(threshold=0.7):
                    vix_block_entries = True
                    cr = current_regime()
                    _log(account_id, 'info',
                         f'{gate_name} bear gate tripped: '
                         f'posterior bear={cr.get("posterior",{}).get("bear",0):.2f} — '
                         f'pausing new entries')
            except Exception as e:  # noqa: BLE001
                _log(account_id, 'warning', f'regime gate failed: {e}')

        cash = float(a['cash'])
        # On the very first tick (last_run_date is NULL) we include the start_date
        # itself so a fresh account can buy on its creation day. On subsequent
        # ticks we exclude start_iso to avoid re-replaying the last processed bar.
        first_tick = a['last_run_date'] is None
        start_iso = a['last_run_date'] or a['start_date']
        max_dd_stop_pct = float(a['max_drawdown_stop_pct'] or 0)
        peak_equity = float(a['peak_equity'] or a['initial_capital'])
        if peak_equity <= 0:
            peak_equity = float(a['initial_capital'])
        sym_dd_stop_pct = float(a['symbol_drawdown_stop_pct'] or 0) if 'symbol_drawdown_stop_pct' in a.keys() else 0.0
        try:
            disabled_symbols = set(json.loads(a['disabled_symbols_json'] or '[]')) if 'disabled_symbols_json' in a.keys() else set()
        except Exception:
            disabled_symbols = set()
        # Symbol-level P&L tracking — computed from closed positions to date
        per_symbol_pnl: Dict[str, float] = {}
        per_symbol_peak: Dict[str, float] = {}
        for r in c.execute(
            "SELECT symbol, COALESCE(SUM(pnl_abs),0) AS p FROM paper_positions WHERE account_id=? AND status='closed' GROUP BY symbol",
            (account_id,)).fetchall():
            per_symbol_pnl[r['symbol']] = float(r['p'])
            per_symbol_peak[r['symbol']] = max(0.0, float(r['p']))
        # Build set of dates to replay: every business day strictly after start_iso, up to target_iso
        # We iterate by date string and let yfinance dictate which are real trading days.

        account_ccy = (a['base_currency'] if 'base_currency' in a.keys() and a['base_currency'] else 'USD')

        # Earnings-proximity gate: skip new entries on symbols whose next
        # earnings is within ENTRY_BLACKOUT_DAYS. We compute this once per
        # tick (forward-looking) and apply to all replay days — it's an
        # approximation since we lack historical earnings dates, but it
        # conservatively avoids entering today on a name about to print.
        ENTRY_BLACKOUT_DAYS = 5
        avoid_earnings: set = set()
        try:
            from .pro_calendar import _fetch_calendar  # type: ignore
        except Exception:
            try:
                from web.modules.pro_calendar import _fetch_calendar  # type: ignore
            except Exception:
                _fetch_calendar = None  # type: ignore
        # E1 — dual-source calendar first (DB read, no network); per-symbol
        # yfinance stays as the fallback so a fresh install / failed nightly
        # refresh degrades to the legacy behavior, never to no-gate.
        _ec_mod = None
        if bool(plan.get('earnings_v2')):
            try:
                try:
                    from . import earnings_calendar as _ec_mod  # type: ignore
                except ImportError:
                    from web.modules import earnings_calendar as _ec_mod  # type: ignore
            except Exception:
                _ec_mod = None
        if _fetch_calendar or _ec_mod:
            cal_failures = 0
            for sym in symbols:
                try:
                    d_to = None
                    if _ec_mod is not None:
                        ev = _ec_mod.next_earnings(sym)
                        if ev:
                            d_to = (date.fromisoformat(ev['event_date'])
                                    - date.today()).days
                    if d_to is None and _fetch_calendar:
                        cal = _fetch_calendar(sym)
                        if cal and cal.get('next_event_type') == 'earnings_date':
                            d_to = cal.get('next_event_days')
                    if d_to is not None and 0 <= d_to <= ENTRY_BLACKOUT_DAYS:
                        avoid_earnings.add(sym)
                except Exception:
                    cal_failures += 1
                    continue
            # If more than half of the calendar lookups failed, the
            # blackout is effectively disabled for those symbols — we
            # want the tick + dashboard to surface that, not just log it.
            if cal_failures and symbols and cal_failures >= max(1, len(symbols) // 2):
                tick_warnings.append({
                    'kind': 'earnings_calendar_degraded',
                    'detail': f'{cal_failures}/{len(symbols)} earnings lookups failed; '
                              'blackout gate not applied to those names',
                })
                _log(account_id, 'warning',
                     f'earnings calendar degraded ({cal_failures}/{len(symbols)} lookups failed) — '
                     'blackout gate partially disabled')
            # E1 — surface low dual-source coverage even when individual
            # lookups didn't raise (the dangerous failure is silent).
            if _ec_mod is not None and symbols:
                try:
                    cov = _ec_mod.coverage_stats(symbols)
                    if cov['checked_frac'] < 0.6:
                        tick_warnings.append({
                            'kind': 'earnings_calendar_low_coverage',
                            'detail': f"dual-source calendar covers only "
                                      f"{cov['checked_frac']:.0%} of universe "
                                      f"(refresh job degraded?)",
                        })
                except Exception:
                    pass
        else:
            # We couldn't even import pro_calendar — gate is entirely off.
            tick_warnings.append({
                'kind': 'earnings_calendar_unavailable',
                'detail': 'pro_calendar module not importable; earnings blackout disabled',
            })
            _log(account_id, 'warning',
                 'pro_calendar import failed — earnings blackout disabled for this tick')
        if avoid_earnings:
            _log(account_id, 'info',
                 f"earnings blackout: {sorted(avoid_earnings)} "
                 f"skipped (within {ENTRY_BLACKOUT_DAYS}d)")

        # Multi-timeframe gate: pre-compute weekly trend per symbol once per tick.
        weekly_block: set = set()
        if mtf_gate:
            for sym in symbols:
                up = _weekly_trend_up(sym)
                if up is False:
                    weekly_block.add(sym)
            if weekly_block:
                _log(account_id, 'info',
                     f'MTF gate blocked entries on {sorted(weekly_block)} (weekly trend down)')

        # Pre-fetch per-symbol series + signal arrays (prices converted to account ccy)
        series: Dict[str, Dict[str, Any]] = {}
        for sym in symbols:
            res = _signals_for(sym, plan, account_ccy=account_ccy)
            if not res:
                continue
            dates, closes, highs, lows, sigs, exit_sigs = res
            # Pre-compute ATR(14) once per symbol for ATR-based stops.
            atr_val = _atr(highs, lows, closes, 14) if atr_stop_mult > 0 else 0.0
            series[sym] = {
                'dates': dates, 'closes': closes,
                'highs': highs, 'lows': lows,
                'signals': sigs, 'exit_signals': exit_sigs,
                'idx_by_date': {d: i for i, d in enumerate(dates)},
                'atr': atr_val,
            }
        # High-water mark per open position (for trailing stop). Reset each tick;
        # rebuilt by walking historical closes for currently-open rows.
        peak_price: Dict[int, float] = {}
        if not series:
            return {'success': False, 'error': '無法取得任何標的的歷史數據'}

        # Build a chronological list of trading days within [start, target] from any symbol
        if first_tick:
            all_dates = sorted({d for s in series.values() for d in s['dates']
                                if start_iso <= d <= target_iso})
        else:
            all_dates = sorted({d for s in series.values() for d in s['dates']
                                if start_iso < d <= target_iso})

        new_tx = 0
        days_processed = 0
        for d in all_dates:
            days_processed += 1
            # 1) Check exits on currently open positions
            open_rows = c.execute(
                "SELECT * FROM paper_positions WHERE account_id=? AND status='open'",
                (account_id,)).fetchall()
            for p in open_rows:
                sym = p['symbol']
                # E3 — T+1 settlement: mainland A-shares bought today cannot
                # be sold today, stops included (that IS the rule — the
                # market does not let you stop out of a same-day buy).
                # NOTE: the exits-before-entries day ordering already makes
                # same-day entry→exit impossible; this is a defense-in-depth
                # INVARIANT against future reordering. hold_cooldown_days is
                # exit→re-entry — the opposite direction — and can't cover it.
                if (plan.get('cn_t_plus_one') and _venue_for(sym) == 'CN'
                        and p['entry_date'] == d):
                    continue
                s = series.get(sym)
                if not s or d not in s['idx_by_date']:
                    continue
                i = s['idx_by_date'][d]
                price = float(s['closes'][i])
                bar_high = float(s['highs'][i]) if i < len(s['highs']) else price
                bar_low = float(s['lows'][i]) if i < len(s['lows']) else price
                entry = float(p['entry_price'])

                # Update high-water mark for trailing stop
                pid = p['id']
                if trailing_stop_pct > 0:
                    peak_price[pid] = max(peak_price.get(pid, entry), price)

                # Gap-aware TP/SL (Audit #6).
                # Old check used `price` (close) only — but in reality TP/SL
                # are limit/stop orders that trigger intraday. A bar where
                # the LOW touches the stop must fill at the stop (or worse,
                # at the bar's low if the open already gapped past).
                #
                # Fill model:
                #   - If the threshold sits within [bar_low, bar_high] →
                #     fill exactly at the threshold (limit-order semantics).
                #   - If the entire bar is past the threshold (gap-through)
                #     → fill at the WORSE extreme: bar_low for SL, bar_high
                #     for TP. This is conservative and prevents the old
                #     model's silent assumption that TP/SL always filled
                #     exactly at the trigger price.
                exit_reason: Optional[str] = None
                exit_price = price  # default — overwritten on TP/SL hit
                # T17D — after ALL ladder steps fired, suppress the static TP
                # so the remainder can ride the trailing stop. Without this,
                # the TP would fire again at 1× and close the runner.
                _post_ladder = (ladder_steps > 0 and
                                'partial_exit_count' in p.keys() and
                                int(p['partial_exit_count'] or 0) >= ladder_steps)
                tp_level = (entry * (1 + tp)) if (tp > 0 and not _post_ladder) else None
                sl_level = entry * (1 - sl) if sl > 0 else None
                atr_sl_level = (entry - atr_stop_mult * s['atr']) if (
                    atr_stop_mult > 0 and s.get('atr', 0) > 0) else None
                trail_level = (peak_price.get(pid, 0) * (1 - trailing_stop_pct)) if (
                    trailing_stop_pct > 0 and peak_price.get(pid, 0) > 0) else None

                # T17D — Profit-taking ladder. Fire BEFORE the regular TP check
                # so that a position at +20% with ladder=[1.0, 2.0] does a
                # partial trim rather than a full TP close.
                # We loop one step per tick — even if the price screams past
                # multiple levels in one bar, ladder one step at a time so the
                # bandit gets per-trim feedback. Remaining steps fire on
                # subsequent bars.
                partial_done = int(p['partial_exit_count'] or 0) if 'partial_exit_count' in p.keys() else 0
                if (tp > 0 and ladder_steps > 0 and partial_done < ladder_steps
                        and tp_level is not None):
                    step_mult = float(ladder_pcts[partial_done])
                    step_target = entry * (1 + tp * step_mult)
                    if bar_high >= step_target:
                        trim_frac = float(ladder_trim[partial_done])
                        # Compute trim shares; round to whole shares to avoid
                        # fractional artifacts. Floor so we never trim more
                        # than the position holds.
                        trim_shares = int(p['shares'] * trim_frac)
                        if trim_shares > 0 and trim_shares < p['shares']:
                            trim_exit_price = step_target if bar_low <= step_target else step_target
                            sell_value = trim_shares * trim_exit_price
                            sell_cost_pct = total_transaction_cost_bps(sym, 'sell', sell_value)
                            proceeds = sell_value * (1 - sell_cost_pct)
                            trim_pnl_abs = proceeds - trim_shares * entry
                            trim_pnl_pct = (trim_exit_price / entry - 1) * 100 if entry else 0
                            cash += proceeds
                            remaining = p['shares'] - trim_shares
                            ladder_reason = f'ladder_trim_{partial_done + 1}'
                            # Update position: reduce shares, bump count.
                            c.execute(
                                '''UPDATE paper_positions
                                   SET shares=?, partial_exit_count=?
                                   WHERE id=?''',
                                (remaining, partial_done + 1, p['id']))
                            c.execute(
                                '''INSERT INTO paper_transactions
                                   (account_id, position_id, type, symbol, shares,
                                    price, value, fee, cash_after, reason, ts_date)
                                   VALUES (?, ?, 'sell', ?, ?, ?, ?, ?, ?, ?, ?)''',
                                (account_id, p['id'], sym, trim_shares,
                                 trim_exit_price,
                                 float(sell_value),
                                 float(sell_value * sell_cost_pct),
                                 float(cash), ladder_reason, d))
                            new_tx += 1
                            _log(account_id, 'info',
                                 f'ladder trim {partial_done+1}/{ladder_steps} '
                                 f'{sym}: {trim_shares}sh @ ${trim_exit_price:.2f} '
                                 f'(+{trim_pnl_pct:.1f}%, ${trim_pnl_abs:.0f}); '
                                 f'remaining {remaining}sh')
                            # Skip the rest of the exit checks this bar so we
                            # don't also trigger TP on the same hop. Next bar
                            # the next step (or full TP) can fire.
                            continue

                # Gap-aware exit selection (loss-side priority) — shared with
                # the optimizer backtest via _select_exit so the two engines
                # price stops/targets identically. The soft-exit decision
                # prefers the explicit exit_signals array (computed at a softer
                # combine-mode than entry, see _build_exit_signals) and falls
                # back to a 1→0 signal cross.
                exit_arr = s.get('exit_signals')
                # P1a — with fill_mode='next_close' the soft exit acts on the
                # PREVIOUS bar's signal state (decision made at yesterday's
                # close, executed at today's close). Price-level exits above
                # (SL/TP/trailing/ATR) are intraday limit/stop semantics, not
                # look-ahead, so they stay unlagged.
                _j = i - sig_lag
                _sig = s['signals'][_j] if _j >= 0 else 0
                _prev_sig = s['signals'][_j - 1] if _j > 0 else 0
                _exit_now = ((exit_arr is not None and _j >= 0 and exit_arr[_j] == 1)
                             or (_sig == 0 and _prev_sig == 1))
                exit_reason, exit_price = _select_exit(
                    price, bar_high, bar_low,
                    sl_level=sl_level, atr_sl_level=atr_sl_level,
                    trail_level=trail_level, tp_level=tp_level,
                    exit_signal_now=_exit_now)
                if exit_reason:
                    sell_value = p['shares'] * exit_price
                    sell_cost_pct = total_transaction_cost_bps(sym, 'sell', sell_value)
                    proceeds = sell_value * (1 - sell_cost_pct)
                    pnl_abs = proceeds - p['shares'] * entry
                    pnl_pct = (exit_price / entry - 1) * 100 if entry else 0
                    cash += proceeds
                    c.execute('''UPDATE paper_positions SET status='closed',
                                 exit_price=?, exit_date=?, exit_reason=?,
                                 pnl_abs=?, pnl_pct=? WHERE id=?''',
                              (exit_price, d, exit_reason, float(pnl_abs), float(pnl_pct), p['id']))
                    # T6.5: credit/debit the bandit for the strategy that
                    # opened this position. We treat any positive P&L
                    # (after fees) as a win — break-even or negative as
                    # a loss. Best-effort: never let a bandit write fail
                    # the tick.
                    entry_strat_for_pos = None
                    try:
                        entry_strat_for_pos = p['entry_strategy'] if 'entry_strategy' in p.keys() else None
                    except Exception:
                        entry_strat_for_pos = None
                    if entry_strat_for_pos:
                        try:
                            try:
                                from .paper_learning import record_bandit_reward
                            except Exception:
                                from web.modules.paper_learning import record_bandit_reward  # type: ignore
                            record_bandit_reward(account_id, entry_strat_for_pos,
                                                 won=(pnl_abs > 0),
                                                 conn_factory=_conn,
                                                 pnl_pct=float(pnl_pct))
                        except Exception as e:
                            _log(account_id, 'warning',
                                 f'bandit reward write failed for {entry_strat_for_pos}: {e}')
                    c.execute('''INSERT INTO paper_transactions
                                 (account_id, position_id, type, symbol, shares, price, value, fee, cash_after, reason, ts_date)
                                 VALUES (?, ?, 'sell', ?, ?, ?, ?, ?, ?, ?, ?)''',
                              (account_id, p['id'], sym, p['shares'], exit_price,
                               float(p['shares'] * exit_price),
                               float(sell_value * sell_cost_pct),
                               float(cash), exit_reason, d))
                    new_tx += 1
                    # Update per-symbol P&L tracking; check blacklist threshold
                    cum_pnl = per_symbol_pnl.get(sym, 0.0) + float(pnl_abs)
                    per_symbol_pnl[sym] = cum_pnl
                    if cum_pnl > per_symbol_peak.get(sym, 0.0):
                        per_symbol_peak[sym] = cum_pnl
                    if sym_dd_stop_pct > 0 and sym not in disabled_symbols:
                        peak_pnl = per_symbol_peak.get(sym, 0.0)
                        # Threshold is on $ drawdown vs (peak P&L + initial slice).
                        # Use $ drop relative to allocated capital_slice * (pos_pct/100).
                        slice_est = float(a['initial_capital']) * (pos_pct)
                        if slice_est > 0:
                            dd_dollars = peak_pnl - cum_pnl
                            dd_ratio = dd_dollars / slice_est * 100
                            if dd_ratio >= sym_dd_stop_pct:
                                disabled_symbols.add(sym)
                                _log(account_id, 'warning',
                                     f'symbol {sym} blacklisted: DD ${dd_dollars:.2f} / '
                                     f'${slice_est:.2f} = {dd_ratio:.2f}% (>= {sym_dd_stop_pct}%)')

            # 2) Check entries
            # NOTE: relaxed entry — `sig==1` is enough; the "skip if already
            # holding" check prevents double-buys. Exits are softened via
            # _build_exit_signals so the lifecycle stays balanced.
            for sym, s in series.items():
                if d not in s['idx_by_date']:
                    continue
                i = s['idx_by_date'][d]
                if i == 0:
                    continue
                if sym in disabled_symbols:
                    continue
                if sym in avoid_earnings:
                    continue
                if sym in weekly_block:
                    continue
                # VIX gate — audit fix: previously this only blocked today's
                # bar (`d == today_iso`), so a fresh account replaying Mar
                # 2020 entered at the worst possible time. Now block all
                # entries on any replay day when the gate is tripped.
                if vix_block_entries:
                    continue
                # P1a — next_close mode enters on YESTERDAY's signal at
                # today's close; same_close (legacy) keeps the original
                # same-bar fill. i==0 is already skipped above, so i-sig_lag
                # is always a valid index.
                sig = s['signals'][i - sig_lag]
                if sig != 1:
                    continue
                # T15 VWAP-distance gate — reject entries that are chasing
                # an overextended move OR catching a knife. Skipped when
                # both thresholds are 0 (disabled) or insufficient history.
                if vwap_chase_max_pct > 0 or vwap_undercut_max_pct > 0:
                    close_seg = s['closes'][:i + 1]
                    high_seg = s['highs'][:i + 1]
                    low_seg = s['lows'][:i + 1]
                    dist = _vwap_distance_pct(close_seg, high_seg, low_seg,
                                              window=vwap_window)
                    if dist is not None:
                        if vwap_chase_max_pct > 0 and dist > vwap_chase_max_pct:
                            _log(account_id, 'info',
                                 f'VWAP chase block {sym}: +{dist:.2f}% > {vwap_chase_max_pct}%')
                            continue
                        if vwap_undercut_max_pct > 0 and dist < -vwap_undercut_max_pct:
                            _log(account_id, 'info',
                                 f'VWAP knife block {sym}: {dist:.2f}% < -{vwap_undercut_max_pct}%')
                            continue
                # Skip if already holding this symbol
                already = c.execute(
                    "SELECT id FROM paper_positions WHERE account_id=? AND symbol=? AND status='open'",
                    (account_id, sym)).fetchone()
                if already:
                    continue
                # Anti-churn cooldown — block re-entry on a symbol we just
                # closed within hold_cooldown_days. Fixes the buy→sell→buy
                # same-day pattern observed during Track-1 smoke test.
                if hold_cooldown_days > 0:
                    last_close = c.execute(
                        "SELECT exit_date FROM paper_positions "
                        "WHERE account_id=? AND symbol=? AND status='closed' "
                        "ORDER BY id DESC LIMIT 1",
                        (account_id, sym)).fetchone()
                    if last_close and last_close['exit_date']:
                        try:
                            gap_days = (date.fromisoformat(d) -
                                        date.fromisoformat(last_close['exit_date'])).days
                            if gap_days < hold_cooldown_days:
                                continue
                        except Exception as e:
                            _log(account_id, 'warning',
                                 f'cooldown date parse failed for {sym} '
                                 f'(today={d} exit={last_close["exit_date"]}): {e}')
                price = float(s['closes'][i])

                # Compute current account equity for the sizing/cap basis.
                # Audit finding: caps using ONLY initial_capital lock the
                # account at its starting size forever — an account that
                # doubled couldn't deploy the gains. We use the LARGER of
                # initial and current equity as the cap basis, so winners
                # can compound while losers stay protected.
                positions_mtm = 0.0
                held_syms_now: List[str] = []
                for r in c.execute(
                    "SELECT entry_price, symbol, shares FROM paper_positions WHERE account_id=? AND status='open'",
                    (account_id,)).fetchall():
                    held_syms_now.append(r['symbol'])
                    s_held = series.get(r['symbol'])
                    if s_held:
                        lk = _last_known_close(s_held, d)
                        positions_mtm += float(r['shares']) * (lk if lk is not None else float(r['entry_price']))
                    else:
                        positions_mtm += float(r['shares']) * float(r['entry_price'])
                current_equity = cash + positions_mtm
                cap_basis = max(float(a['initial_capital']), current_equity)

                # Sector concentration cap — sum MTM of open positions in
                # the candidate's sector; reject the entry if a min-sized
                # add would already breach max_per_sector_pct * cap_basis.
                # Disabled when max_per_sector_pct == 0 or sector unknown.
                if max_per_sector_pct > 0:
                    cand_sector = sector_by_symbol.get(sym)
                    if cand_sector:
                        sector_mtm = 0.0
                        for r in c.execute(
                            "SELECT symbol, shares FROM paper_positions "
                            "WHERE account_id=? AND status='open'",
                            (account_id,)).fetchall():
                            held_sec = sector_by_symbol.get(r['symbol']) or _symbol_sector(
                                r['symbol'], allow_network=False)
                            if held_sec != cand_sector:
                                continue
                            s_held = series.get(r['symbol'])
                            if s_held and d in s_held['idx_by_date']:
                                sector_mtm += float(r['shares']) * float(
                                    s_held['closes'][s_held['idx_by_date'][d]])
                        sector_cap = cap_basis * max_per_sector_pct
                        # Reject if already at or past the cap; we don't try
                        # to fit a smaller order — keeps logic simple and
                        # avoids placing token positions.
                        if sector_mtm >= sector_cap:
                            _log(account_id, 'info',
                                 f'sector cap blocked {sym} ({cand_sector}): '
                                 f'sector MTM ${sector_mtm:.0f} >= cap ${sector_cap:.0f}')
                            continue

                # Position sizing. Three modes (T11):
                #   - kelly:      use the bandit table's per-strategy win-rate
                #                 + payoff ratio to size by Kelly fraction.
                #                 Falls back to vol_target/fixed when the
                #                 sample is too small to be reliable.
                #   - vol_target: weight = vol_target / realized_vol  (T-existing)
                #   - fixed:      slice_cash = cash * pos_pct          (legacy)
                sizing_mode = (plan.get('sizing_mode') or 'fixed').lower()
                kelly_safety = float(plan.get('kelly_safety') or _KELLY_DEFAULT_SAFETY)
                kelly_weight: Optional[float] = None
                if sizing_mode == 'kelly':
                    # Pick the strategy that would fire BUY on this bar (first
                    # match wins, mirrors the entry_strategy tagging below).
                    cand_strategy: Optional[str] = None
                    try:
                        for cs in (plan.get('strategies') or []):
                            votes = _build_signals(cs, s['closes'], s['highs'], s['lows'])
                            # P1a — attribute to the vote on the bar that
                            # actually fired the (possibly lagged) signal.
                            if i - sig_lag < len(votes) and votes[i - sig_lag] == 1:
                                cand_strategy = cs
                                break
                    except Exception:
                        cand_strategy = None
                    if cand_strategy:
                        try:
                            with _conn() as c2:
                                c2.row_factory = sqlite3.Row
                                br = c2.execute(
                                    '''SELECT wins, losses,
                                              COALESCE(avg_win_pct,0) AS avg_win_pct,
                                              COALESCE(avg_loss_pct,0) AS avg_loss_pct
                                       FROM bandit_state
                                       WHERE account_id=? AND strategy=?''',
                                    (account_id, cand_strategy)).fetchone()
                            k_wins = int(br['wins']) if br else 0
                            k_losses = int(br['losses']) if br else 0
                            k_aw = float(br['avg_win_pct'] or 0) if br else 0.0
                            k_al = float(br['avg_loss_pct'] or 0) if br else 0.0
                            # Phase 5: when THIS account's sample for the
                            # strategy is too thin for Kelly (≈never reaches 20
                            # at a couple trades/month), fall back to the SAME
                            # strategy's record pooled across all accounts so
                            # Kelly can actually engage. A strategy behaves
                            # similarly across names, so the pooled stats are a
                            # sound prior; the per-account row takes over once
                            # it's rich enough on its own.
                            if k_wins + k_losses < _KELLY_MIN_SAMPLES:
                                try:
                                    try:
                                        from .paper_learning import pooled_strategy_stats
                                    except Exception:
                                        from web.modules.paper_learning import pooled_strategy_stats  # type: ignore
                                    pooled = pooled_strategy_stats(cand_strategy, _conn)
                                    if pooled['wins'] + pooled['losses'] > k_wins + k_losses:
                                        k_wins, k_losses = pooled['wins'], pooled['losses']
                                        k_aw, k_al = pooled['avg_win_pct'], pooled['avg_loss_pct']
                                except Exception:
                                    pass
                            kelly_weight = _kelly_fraction(
                                k_wins, k_losses, k_aw, k_al, safety=kelly_safety)
                        except sqlite3.Error:
                            kelly_weight = None

                if kelly_weight is not None:
                    # Cap by max_per_name so Kelly can never exceed the
                    # account's per-name concentration policy.
                    weight = min(kelly_weight, max_per_name_pct)
                    slice_cash = cap_basis * weight
                elif sizing_mode == 'kelly' and vol_target > 0:
                    # Kelly insufficient data → defer to vol_target.
                    sigma = _sigma_for_sizing(sym, s['closes'][:i + 1], plan)
                    weight = min(vol_target / sigma, max_per_name_pct)
                    weight = max(weight, 0.01)
                    slice_cash = cap_basis * weight
                elif vol_target > 0:
                    sigma = _sigma_for_sizing(sym, s['closes'][:i + 1], plan)
                    weight = min(vol_target / sigma, max_per_name_pct)
                    weight = max(weight, 0.01)
                    slice_cash = cap_basis * weight
                else:
                    # Phase 4: size off the EQUITY basis (cap_basis = max(initial,
                    # current_equity)), not declining cash. The old `cash * pos_pct`
                    # starved later entries in a tick — once a few positions opened,
                    # cash shrank and every subsequent name got a smaller slice, so
                    # capital sat idle. Equity-based sizing deploys the intended
                    # pos_pct per name; the budget_left + available-cash caps below
                    # keep it from overcommitting.
                    slice_cash = cap_basis * pos_pct

                # P2 — ranker-confidence gate (1.0 for non-ranker accounts).
                slice_cash *= size_gate

                # P7 — correlation-aware sizing: shrink the slice (never to
                # below half, never blocking) when the candidate's returns
                # correlate with what the book already holds. Same-bet
                # stacking is how "diversified" accounts blow their vol
                # target in one drawdown.
                if bool(plan.get('corr_aware_sizing')) and held_syms_now:
                    corr_mult = _corr_sizing_multiplier(
                        series, sym, held_syms_now, d)
                    if corr_mult < 1.0:
                        slice_cash *= corr_mult
                        _log(account_id, 'info',
                             f'corr sizing {sym}: ×{corr_mult:.2f} '
                             f'(vs {len(held_syms_now)} held)')

                # Leverage cap on max(initial, current) instead of initial only.
                budget_left = max(0.0, cap_basis - positions_mtm)
                slice_cash = min(slice_cash, budget_left)

                # Per-name cap also on the dynamic basis.
                per_name_cap = cap_basis * max_per_name_pct
                slice_cash = min(slice_cash, per_name_cap)

                # Never spend more than the cash actually on hand — guards the
                # equity-based sizing above during a drawdown, where
                # cap_basis (=initial) can exceed current equity/cash.
                slice_cash = min(slice_cash, cash)

                if slice_cash <= 0:
                    continue

                # Per-venue buy fee (used for both lot rounding and cost calc)
                buy_bps = _fee_bps(sym, 'buy')
                lot = _lot_size(sym)
                # Use the all-in cost (fee + half-spread + size slippage) for
                # lot rounding so we don't overcommit cash on illiquid names.
                all_in_buy = total_transaction_cost_bps(sym, 'buy', slice_cash)
                lots = int(slice_cash / (price * lot * (1 + all_in_buy))) if price > 0 else 0
                shares = lots * lot
                if shares <= 0:
                    continue
                trade_value = shares * price
                # Min trade value floor — avoid placing tiny odd-lot orders
                # whose fees dominate.
                if trade_value < min_trade_value:
                    continue
                # Total cash effect = trade_value × (1 + fee + half_spread + slippage)
                buy_cost_pct = total_transaction_cost_bps(sym, 'buy', trade_value)
                cost = trade_value * (1 + buy_cost_pct)
                cash -= cost
                # T6.5: tag the trade with which sub-strategy actually
                # voted BUY at this bar. Compute each strategy's vote and
                # pick the first one — that's the strategy we'll
                # credit/debit on close. Pure-best-effort; if it fails the
                # column stays NULL and the bandit just skips this row.
                entry_strategy = None
                try:
                    for cand_strat in (plan.get('strategies') or []):
                        votes = _build_signals(cand_strat, s['closes'], s['highs'], s['lows'])
                        # P1a — same lagged-bar attribution as the entry signal.
                        if i - sig_lag < len(votes) and votes[i - sig_lag] == 1:
                            entry_strategy = cand_strat
                            break
                except Exception:
                    entry_strategy = None
                cur = c.execute('''INSERT INTO paper_positions
                             (account_id, symbol, shares, entry_price, entry_date, entry_reason,
                              entry_strategy, status)
                             VALUES (?, ?, ?, ?, ?, ?, ?, 'open')''',
                          (account_id, sym, shares, price, d, 'signal', entry_strategy))
                pos_id = cur.lastrowid
                c.execute('''INSERT INTO paper_transactions
                             (account_id, position_id, type, symbol, shares, price, value, fee, cash_after, reason, ts_date)
                             VALUES (?, ?, 'buy', ?, ?, ?, ?, ?, ?, 'entry_signal', ?)''',
                          (account_id, pos_id, sym, shares, price,
                           float(trade_value), float(trade_value * buy_bps),
                           float(cash), d))
                new_tx += 1

            # 3) End-of-day equity snapshot
            #
            # Carryover pricing: when a symbol has no bar on `d` (venue holiday
            # mismatch, late feed, or a cache miss) we value the position at
            # its LAST KNOWN close — never at zero. Zeroing was the cause of
            # the catastrophic "1-day -67%" snapshots seen on accts #4/#7/#8:
            # one missed bar on a multi-position day flattened positions_value
            # and tripped the auto-drawdown stop, paused the account and
            # locked it out for a feed glitch.
            positions_value = 0.0
            stale_carryover: List[str] = []  # symbols valued from cache, not today's bar
            for r in c.execute(
                "SELECT entry_price, symbol, shares FROM paper_positions WHERE account_id=? AND status='open'",
                (account_id,)).fetchall():
                s = series.get(r['symbol'])
                if s and d in s['idx_by_date']:
                    positions_value += r['shares'] * float(s['closes'][s['idx_by_date'][d]])
                else:
                    lk = _last_known_close(s, d) if s else None
                    if lk is None:
                        lk = float(r['entry_price'])
                    positions_value += r['shares'] * lk
                    stale_carryover.append(r['symbol'])
            if stale_carryover:
                _log(account_id, 'info',
                     f'equity snapshot {d}: carryover pricing for {sorted(set(stale_carryover))} '
                     f'(no fresh bar — using last known close)')
            equity = cash + positions_value
            c.execute(
                'INSERT OR REPLACE INTO paper_equity_history (account_id, date, cash, positions_value, equity) VALUES (?, ?, ?, ?, ?)',
                (account_id, d, cash, positions_value, equity),
            )

            # Track all-time peak so drawdown is measured against the high-water mark
            if equity > peak_equity:
                peak_equity = equity

            # Auto-stop on drawdown — close all open positions and pause the account
            if max_dd_stop_pct > 0 and peak_equity > 0:
                dd_pct = (peak_equity - equity) / peak_equity * 100.0
                if dd_pct >= max_dd_stop_pct:
                    open_now = c.execute(
                        "SELECT * FROM paper_positions WHERE account_id=? AND status='open'",
                        (account_id,)).fetchall()
                    for p in open_now:
                        s = series.get(p['symbol'])
                        # Liquidation must price at a real number, not $0.
                        # Use today's bar if available, else the last known
                        # close. If even that fails, skip the liquidation for
                        # this position — better to leave it open than to
                        # crystallize a fake loss at zero.
                        if s and d in s['idx_by_date']:
                            ep = float(s['closes'][s['idx_by_date'][d]])
                        else:
                            lk = _last_known_close(s, d) if s else None
                            if lk is None:
                                _log(account_id, 'warning',
                                     f'drawdown-liquidate skipped {p["symbol"]} on {d}: no price available')
                                continue
                            ep = lk
                        sell_bps = _fee_bps(p['symbol'], 'sell')
                        proceeds = p['shares'] * ep * (1 - sell_bps)
                        pnl_abs = proceeds - p['shares'] * p['entry_price']
                        pnl_pct = (ep / p['entry_price'] - 1) * 100 if p['entry_price'] else 0
                        cash += proceeds
                        c.execute('''UPDATE paper_positions SET status='closed',
                                     exit_price=?, exit_date=?, exit_reason='auto_drawdown_stop',
                                     pnl_abs=?, pnl_pct=? WHERE id=?''',
                                  (ep, d, float(pnl_abs), float(pnl_pct), p['id']))
                        c.execute('''INSERT INTO paper_transactions
                                     (account_id, position_id, type, symbol, shares, price, value, fee, cash_after, reason, ts_date)
                                     VALUES (?, ?, 'sell', ?, ?, ?, ?, ?, ?, 'auto_drawdown_stop', ?)''',
                                  (account_id, p['id'], p['symbol'], p['shares'], ep,
                                   float(p['shares'] * ep), float(p['shares'] * ep * sell_bps),
                                   float(cash), d))
                        new_tx += 1
                    # Update final-day equity snapshot post-liquidation
                    final_eq = cash
                    c.execute(
                        'INSERT OR REPLACE INTO paper_equity_history (account_id, date, cash, positions_value, equity) VALUES (?, ?, ?, ?, ?)',
                        (account_id, d, cash, 0.0, final_eq),
                    )
                    paused_msg = f'auto_drawdown_stop: -{dd_pct:.2f}% from peak ${peak_equity:.2f} on {d}'
                    c.execute(
                        "UPDATE paper_accounts SET status='paused_drawdown', cash=?, last_run_date=?, peak_equity=?, paused_reason=? WHERE id=?",
                        (cash, d, peak_equity, paused_msg, account_id),
                    )
                    c.commit()
                    _log(account_id, 'error', f'auto-paused: {paused_msg}')
                    # Always-on drawdown alert (separate from per-tick toggle)
                    try:
                        from modules.notify import notify_user
                        notify_user(
                            user_id,
                            f"⛔ [{a['name']}] 觸發回撤停損 -{dd_pct:.2f}%",
                            text=(f"帳戶 {a['name']} 自高水位 ${peak_equity:.2f} 回撤 {dd_pct:.2f}% "
                                  f"(超過閾值 {max_dd_stop_pct}%), 已於 {d} 強制平倉並暫停。"
                                  f"目前現金 ${cash:.2f}。"),
                            html=(f"<h3>⛔ 回撤停損觸發</h3>"
                                  f"<p><b>帳戶:</b> {a['name']}<br>"
                                  f"<b>回撤:</b> -{dd_pct:.2f}% (閾值 {max_dd_stop_pct}%)<br>"
                                  f"<b>高水位:</b> ${peak_equity:.2f}<br>"
                                  f"<b>當前現金:</b> ${cash:.2f}<br>"
                                  f"<b>停損日期:</b> {d}</p>"
                                  f"<p>所有持倉已強制平倉，可在 Pro Suite 點 🔄 重新啟用。</p>"),
                            channels={'paper_tick_email': True, 'paper_tick_slack': True, 'paper_tick_telegram': True},
                        )
                    except Exception as ne:
                        _log(account_id, 'warning', f'drawdown alert send failed: {ne}')
                    return {
                        'success': True,
                        'account_id': account_id,
                        'days_processed': days_processed,
                        'new_transactions': new_tx,
                        'last_run_date': d,
                        'cash': cash,
                        'paused': True,
                        'paused_reason': paused_msg,
                        'warnings': tick_warnings,
                    }

        # Persist new cash + last_run_date + peak_equity + disabled_symbols.
        # If this was a first tick that processed nothing (typically: account
        # created before today's bar is available), keep last_run_date NULL so
        # the next tick is still treated as a first tick and can include the
        # start_date once data lands.
        if all_dates:
            last_run = all_dates[-1]
        elif first_tick:
            last_run = None
        else:
            last_run = a['last_run_date']
        c.execute(
            'UPDATE paper_accounts SET cash=?, last_run_date=?, peak_equity=?, disabled_symbols_json=? WHERE id=?',
            (cash, last_run, peak_equity, json.dumps(sorted(disabled_symbols)), account_id),
        )
        c.commit()

    # Optional notification summary (best-effort, never fail the tick).
    # Fans out to email + Slack + Telegram based on user's notification_prefs.
    notify_results: Dict[str, bool] = {}
    if new_tx > 0 and a['email_on_run']:
        try:
            notify_results = _notify_tick_summary(user_id, account_id, new_tx, last_run, cash)
        except Exception as e:
            _log(account_id, 'warning', f'tick notification fan-out failed: {e}')

    # After the tick: if the account opted into auto-evolution, the quant
    # agent runs a walk-forward strategy search and potentially upgrades
    # the live plan to a better-performing config. Best-effort.
    _maybe_auto_evolve(user_id, account_id)

    return {
        'success': True,
        'account_id': account_id,
        'days_processed': days_processed,
        'new_transactions': new_tx,
        'last_run_date': last_run,
        'cash': cash,
        'notifications': notify_results,
        'warnings': tick_warnings,
    }


def _notify_tick_summary(user_id: int, account_id: int, new_tx: int,
                         last_run: str, cash: float) -> Dict[str, bool]:
    """Send tick summary via every channel the user has opted into."""
    with _conn() as c:
        a = c.execute('SELECT name, initial_capital FROM paper_accounts WHERE id=?',
                      (account_id,)).fetchone()
        if not a:
            return {}
        # Compute equity at last_run for the body
        eq = c.execute(
            'SELECT equity FROM paper_equity_history WHERE account_id=? ORDER BY date DESC LIMIT 1',
            (account_id,)).fetchone()
        equity = eq['equity'] if eq else cash
        # Last 5 transactions for the body
        recent = c.execute('''SELECT ts_date, type, symbol, shares, price, reason
                              FROM paper_transactions WHERE account_id=?
                              ORDER BY id DESC LIMIT 5''', (account_id,)).fetchall()

    roi = ((equity / a['initial_capital']) - 1) * 100 if a['initial_capital'] else 0
    sign = '+' if roi >= 0 else ''
    rows = ''.join(
        f"<tr><td style='padding:4px 8px;'>{r['ts_date']}</td>"
        f"<td style='padding:4px 8px;color:{'#16a34a' if r['type']=='buy' else '#dc2626'};font-weight:700;'>"
        f"{'買入' if r['type']=='buy' else '賣出'}</td>"
        f"<td style='padding:4px 8px;'>{r['symbol']}</td>"
        f"<td style='padding:4px 8px;text-align:right;'>{r['shares']}</td>"
        f"<td style='padding:4px 8px;text-align:right;'>${r['price']:.2f}</td>"
        f"<td style='padding:4px 8px;color:#666;'>{r['reason'] or ''}</td></tr>"
        for r in recent
    )
    html = f"""<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#f5f7fb;margin:0;padding:20px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <h2 style="margin:0 0 8px;color:#1a223a;">📈 模擬交易日報 — {a['name']}</h2>
  <p style="color:#666;font-size:13px;margin:0 0 16px;">截至 {last_run}：本期執行了 <b>{new_tx}</b> 筆交易</p>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px;">
    <div style="background:#f5f7fb;padding:12px;border-radius:6px;"><div style="font-size:11px;color:#888;">總資產</div><div style="font-weight:800;font-size:18px;">${equity:,.2f}</div></div>
    <div style="background:#f5f7fb;padding:12px;border-radius:6px;"><div style="font-size:11px;color:#888;">現金</div><div style="font-weight:800;font-size:18px;">${cash:,.2f}</div></div>
    <div style="background:#f5f7fb;padding:12px;border-radius:6px;"><div style="font-size:11px;color:#888;">ROI</div><div style="font-weight:800;font-size:18px;color:{'#16a34a' if roi>=0 else '#dc2626'};">{sign}{roi:.2f}%</div></div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #e5e7eb;">
    <thead style="background:#f5f7fb;color:#666;"><tr>
      <th style="padding:6px 8px;text-align:left;">日期</th><th style="padding:6px 8px;text-align:left;">動作</th>
      <th style="padding:6px 8px;text-align:left;">代碼</th><th style="padding:6px 8px;text-align:right;">股數</th>
      <th style="padding:6px 8px;text-align:right;">價</th><th style="padding:6px 8px;text-align:left;">原因</th>
    </tr></thead>
    <tbody>{rows or '<tr><td colspan=6 style="padding:12px;text-align:center;color:#888;">沒有交易</td></tr>'}</tbody>
  </table>
  <p style="font-size:11px;color:#888;margin-top:16px;">您可以在 Pro Suite → 每日模擬交易 中關閉此通知。</p>
</div></body></html>"""

    text = (f"📈 {a['name']}: {new_tx} 筆新交易, 截至 {last_run}, "
            f"總資產 ${equity:,.2f} (ROI {sign}{roi:.2f}%)")
    try:
        from modules.notify import notify_user
    except Exception:
        from web.modules.notify import notify_user  # type: ignore
    return notify_user(
        user_id,
        f"📈 [{a['name']}] {new_tx} 筆新交易",
        html=html,
        text=text,
    )
