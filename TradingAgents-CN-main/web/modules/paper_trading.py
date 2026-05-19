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
import sqlite3
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional


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


_DB = Path(__file__).resolve().parents[1] / 'trading_agents.db'
FEE_BPS = 5.0 / 10000.0  # 0.05% one-way


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


def _conn():
    c = sqlite3.connect(str(_DB))
    c.row_factory = sqlite3.Row
    return c


# ---------------------------------------------------------------------------
# Currency helpers — let mixed US+HK accounts settle in one currency (HKD).
# Prices fetched from yfinance arrive in the listing currency (USD for US tickers,
# HKD for .HK), so we convert to the account's base currency before any
# storage or P&L math.
# ---------------------------------------------------------------------------
_FX_CACHE: Dict[str, tuple] = {}
_FX_TTL = 12 * 3600  # 12 hours


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


def _fx_rate(from_ccy: str, to_ccy: str) -> float:
    """Return the multiplier turning 1 unit of from_ccy into to_ccy.

    Uses yfinance ticker '<FROM><TO>=X' (e.g. USDHKD=X). Cached for 12h. On
    failure, falls back to a hardcoded USDHKD rate so accounts don't break
    just because the FX feed glitches.
    """
    f, t = from_ccy.upper(), to_ccy.upper()
    if f == t:
        return 1.0
    key = f'{f}{t}'
    cached = _FX_CACHE.get(key)
    if cached and time.time() - cached[0] < _FX_TTL:
        return cached[1]
    rate: Optional[float] = None
    try:
        import yfinance as yf
        # yfinance accepts e.g. 'USDHKD=X' for direct USD→HKD
        h = yf.Ticker(f'{f}{t}=X').history(period='5d', interval='1d')
        if h is not None and not h.empty:
            v = float(h['Close'].dropna().iloc[-1])
            if v > 0:
                rate = v
    except Exception:
        rate = None
    if rate is None:
        # Try the inverse (HKDUSD=X) and reciprocate
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
        # Conservative pegged-USDHKD fallback so the engine never crashes.
        # Warn so operators notice — real rate can move ±2-3% inside the peg.
        if (f, t) == ('USD', 'HKD'):
            rate = 7.80
            print(f"⚠️ FX fallback used: USDHKD={rate} (yfinance feed unavailable, position values may be ±3% off)")
        elif (f, t) == ('HKD', 'USD'):
            rate = 1.0 / 7.80
            print(f"⚠️ FX fallback used: HKDUSD={rate:.5f} (yfinance feed unavailable)")
        else:
            rate = 1.0
            print(f"⚠️ FX fallback: no rate for {f}->{t}, using 1.0 (positions in mixed currencies will be wrong)")
    _FX_CACHE[key] = (time.time(), rate)
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
_MTF_TTL = 12 * 3600  # weekly bar refresh OK at 12h cadence


def _weekly_trend_up(symbol: str) -> Optional[bool]:
    """True if the weekly EMA(20) > EMA(50) on the symbol's weekly chart.

    Pro filter: don't open new longs against the higher-timeframe trend.
    Returns None if data is missing — caller treats None as "don't gate".
    """
    key = f'wkemas:{symbol}'
    cached = _MTF_CACHE.get(key)
    if cached and time.time() - cached[0] < _MTF_TTL:
        return cached[1]
    try:
        import yfinance as yf
        h = yf.Ticker(symbol).history(period='2y', interval='1wk')
        if h is None or h.empty:
            _MTF_CACHE[key] = (time.time(), None)
            return None
        closes = list(h['Close'].dropna().values)
        if len(closes) < 55:
            _MTF_CACHE[key] = (time.time(), None)
            return None

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
    if not s.endswith('.HK'):
        return 1
    return _HK_LOT_SIZES.get(s, 100)


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
        if 'last_evolved_at' not in cols:
            c.execute('ALTER TABLE paper_accounts ADD COLUMN last_evolved_at TEXT')
        if 'evolve_frequency_days' not in cols:
            # 0 = disable auto-evolution; users opt-in by setting > 0
            c.execute('ALTER TABLE paper_accounts ADD COLUMN evolve_frequency_days INTEGER DEFAULT 0')
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

    plan_clean = {
        'symbols': syms,
        'strategies': strats,
        'combine_mode': (plan.get('combine_mode') or 'any').lower(),
        'pos_size_pct': float(plan.get('pos_size_pct') or 20),
        'take_profit_pct': float(plan.get('take_profit_pct') or 0),
        'stop_loss_pct': float(plan.get('stop_loss_pct') or 0),
        'ai_mode': ai_mode,
        'universe': universe,
        'ai_pick_count': ai_pick_count,
        'custom_symbols': custom_symbols,
        'llm_news_filter': bool(plan.get('llm_news_filter')),
        'news_filter_mode': (plan.get('news_filter_mode') or 'lexicon').lower(),
        # Pro risk controls (all opt-in; 0 = disabled)
        'atr_stop_mult': float(plan.get('atr_stop_mult') or 0),       # e.g. 2.0 = stop at entry - 2*ATR(14)
        'trailing_stop_pct': float(plan.get('trailing_stop_pct') or 0),  # e.g. 8.0 = ratchet stop 8% below high-water
        'max_per_name_pct': float(plan.get('max_per_name_pct') or 25),   # cap each position at 25% of initial capital
        'vix_gate_threshold': float(plan.get('vix_gate_threshold') or 0),  # e.g. 30 = no new longs when VIX > 30
        'mtf_gate': bool(plan.get('mtf_gate')),                          # require weekly EMA20>EMA50 before new long
        'vol_target_annual_pct': float(plan.get('vol_target_annual_pct') or 0),  # e.g. 12 = aim for 12% annualized vol per position
    }
    today = date.today().isoformat()

    with _conn() as c:
        cur = c.execute(
            '''INSERT INTO paper_accounts
               (user_id, name, plan_json, initial_capital, cash, status, start_date,
                email_on_run, auto_run, max_drawdown_stop_pct, peak_equity,
                symbol_drawdown_stop_pct, disabled_symbols_json, base_currency)
               VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, '[]', ?)''',
            (user_id, name, json.dumps(plan_clean), capital, capital, today,
             email_on_run, auto_run, max_dd_stop, capital, sym_dd_stop, base_ccy),
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
            'open_positions': r['open_count'],
            'closed_positions': r['closed_count'],
            'plan': json.loads(r['plan_json']),
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

    return {
        'success': True,
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
_EVOLVE_MIN_GAIN = 5.0   # need OOS score lead >= 5 pts before swapping plan


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
                        max_iterations: Optional[int] = None) -> Dict[str, Any]:
    """
    Run one generation of strategy evolution for an account.

    Returns: {success, applied, before, after, baseline, best, top, trials}.
    """
    init_paper_tables()
    try:
        try:
            from modules.autotrade_sim import optimize_plan, simulate_plan, _score_result, _period_to_days
        except Exception:
            from web.modules.autotrade_sim import (  # type: ignore
                optimize_plan, simulate_plan, _score_result, _period_to_days,
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
        'period': '1y',
    }

    # Score the current live plan on the same train/test split so we know
    # what to beat. _score_result lives in autotrade_sim and uses the same
    # weighting (annualized return − 0.5·DD + 2·Sharpe + target bonus).
    days = _period_to_days(base_plan['period'])
    train_days = int(days * 0.7)
    test_days = days - train_days
    baseline_train = simulate_plan(base_plan, slice_range=(0.0, 0.7))
    baseline_test = simulate_plan(base_plan, slice_range=(0.7, 1.0))
    if not (baseline_train.get('success') and baseline_test.get('success')):
        baseline_score = -1e9
        baseline_annual = 0.0
        baseline_metrics = {}
    else:
        _, base_train_annual = _score_result(baseline_train['metrics'], train_days, target_annual)
        baseline_score, baseline_annual = _score_result(baseline_test['metrics'], test_days, target_annual)
        baseline_metrics = baseline_test['metrics']

    iters = max_iterations or _EVOLVE_MIN_TRIALS
    iters = max(_EVOLVE_MIN_TRIALS, min(_EVOLVE_MAX_TRIALS, int(iters)))
    opt = optimize_plan(base_plan, target_monthly_pct=target_monthly_pct,
                        max_iterations=iters, walk_forward=True, train_pct=0.7)
    if not opt.get('success'):
        return {'success': False, 'error': opt.get('error', 'optimization failed'),
                'baseline_score': round(baseline_score, 3),
                'baseline_annual_pct': round(baseline_annual, 3)}

    best = opt.get('best') or {}
    best_score = float(best.get('score') or -1e9)
    best_annual = float(best.get('annual_return_pct') or 0.0)
    new_plan_fields = best.get('plan') or {}

    applied = False
    after_plan = dict(plan)
    if apply_if_better and (best_score - baseline_score) >= _EVOLVE_MIN_GAIN and new_plan_fields:
        # Update only the strategy-related fields — keep symbols/AI-mode/etc
        # owned by the user's account config.
        for k in ('strategies', 'combine_mode', 'take_profit_pct',
                 'stop_loss_pct', 'pos_size_pct'):
            if k in new_plan_fields and new_plan_fields[k] is not None:
                after_plan[k] = new_plan_fields[k]
        applied = True

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
        note_bits.append(f"applied (OOS score +{best_score - baseline_score:.2f})")
    else:
        note_bits.append(f"not applied (gain {best_score - baseline_score:.2f} < {_EVOLVE_MIN_GAIN})")
    note_bits.append(f"trials={opt.get('trials_count')}")
    if opt.get('hit_target_count'):
        note_bits.append(f"hit_target={opt['hit_target_count']}")
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
            c.execute('UPDATE paper_accounts SET plan_json=?, last_evolved_at=? WHERE id=?',
                      (json.dumps(after_plan), now_iso, account_id))
        else:
            c.execute('UPDATE paper_accounts SET last_evolved_at=? WHERE id=?',
                      (now_iso, account_id))
        c.commit()

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
        'target_monthly_pct': target_monthly_pct,
        'target_annual_pct': target_annual,
        'note': note,
    }


def get_account_health(user_id: int, account_id: int) -> Dict[str, Any]:
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
            except Exception:
                pass
        evolve_account_plan(user_id, account_id, trigger='auto')
    except Exception as e:
        print(f"⚠️ auto-evolve failed for account {account_id}: {e}")


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
    return {
        'date': today,
        'rows': rows,
        'totals_by_ccy': totals_by_ccy,
        'total_day_tx': new_tx_count,
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

    sent = 0; skipped = 0; errors: List[str] = []
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
                    print(f"⚠️ leaderboard opt failed for user {uid} '{u['name']}': {e}")

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

        plan = json.loads(a['plan_json'])
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
            proceeds = p['shares'] * last * (1 - FEE_BPS)
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
                       float(p['shares'] * last * FEE_BPS), float(cash), today))

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
def _signals_for(symbol: str, plan: Dict[str, Any], account_ccy: str = 'USD'):
    """Return aligned (dates, closes, highs, lows, signals) for a symbol,
    with prices converted into the account's base currency."""
    data = _fetch(symbol, '1y')
    if not data:
        return None
    dates, closes, highs, lows = data
    if len(closes) < 60:
        return None
    sym_ccy = _symbol_currency(symbol)
    if sym_ccy != account_ccy:
        closes = _convert_series(closes, sym_ccy, account_ccy)
        highs = _convert_series(highs, sym_ccy, account_ccy)
        lows = _convert_series(lows, sym_ccy, account_ccy)
    sigs = _combine_signals(plan['strategies'], plan.get('combine_mode', 'any'),
                            closes, highs, lows)
    exit_sigs = _build_exit_signals(plan['strategies'], plan.get('combine_mode', 'any'),
                                    closes, highs, lows)
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
    if not _claim_tick(account_id):
        _log(account_id, 'warning',
             'tick rejected — another tick is already running for this account')
        return {'success': False, 'error': 'tick already running for this account',
                'account_id': account_id}
    err: Optional[str] = None
    try:
        result = _run_account_tick_impl(user_id, account_id, until_date)
        # Persist a brief tick summary to the log for forensics.
        if result.get('success'):
            _log(account_id, 'info',
                 'tick done',
                 days=result.get('days_processed'),
                 new_tx=result.get('new_transactions'),
                 last_run=result.get('last_run_date'),
                 paused=bool(result.get('paused')))
        else:
            _log(account_id, 'warning', f"tick returned not-success: {result.get('error')}")
        return result
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        err = f"{type(e).__name__}: {e}"
        _log(account_id, 'error', f'tick CRASHED: {err}\n{tb}')
        # Best-effort alert so the user knows the account stopped trading.
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
            try:
                ai_syms = top_long_symbols(universe, top_n=ai_pick_count,
                                           custom_symbols=custom_syms,
                                           news_filter=news_filter,
                                           news_filter_mode=news_mode)
            except Exception as e:
                print(f"⚠️ AI scan failed for account {account_id}: {e}")
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
        max_per_name_pct = float(plan.get('max_per_name_pct') or 25) / 100.0
        vix_gate = float(plan.get('vix_gate_threshold') or 0)
        mtf_gate = bool(plan.get('mtf_gate'))
        vol_target = float(plan.get('vol_target_annual_pct') or 0) / 100.0  # 0 = use fixed pos_pct

        # VIX regime gate: skip new entries this whole tick if VIX above threshold.
        # Existing positions still tick (exits, equity) — only new buys are paused.
        vix_block_entries = False
        if vix_gate > 0:
            vix = _vix_latest()
            if vix is not None and vix > vix_gate:
                vix_block_entries = True
                print(f"📈 VIX gate (account {account_id}): VIX={vix:.1f} > {vix_gate} — pausing new entries this tick")

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
        if _fetch_calendar:
            for sym in symbols:
                try:
                    cal = _fetch_calendar(sym)
                    if cal and cal.get('next_event_type') == 'earnings_date':
                        d_to = cal.get('next_event_days')
                        if d_to is not None and 0 <= d_to <= ENTRY_BLACKOUT_DAYS:
                            avoid_earnings.add(sym)
                except Exception:
                    continue
        if avoid_earnings:
            print(f"📅 Earnings blackout (account {account_id}): {sorted(avoid_earnings)} skipped for new entries (within {ENTRY_BLACKOUT_DAYS}d)")

        # Multi-timeframe gate: pre-compute weekly trend per symbol once per tick.
        weekly_block: set = set()
        if mtf_gate:
            for sym in symbols:
                up = _weekly_trend_up(sym)
                if up is False:
                    weekly_block.add(sym)
            if weekly_block:
                print(f"📊 MTF gate (account {account_id}): {sorted(weekly_block)} blocked — weekly trend down")

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
                s = series.get(sym)
                if not s or d not in s['idx_by_date']:
                    continue
                i = s['idx_by_date'][d]
                price = float(s['closes'][i])

                # Update high-water mark for trailing stop
                pid = p['id']
                if trailing_stop_pct > 0:
                    peak_price[pid] = max(peak_price.get(pid, float(p['entry_price'])), price)

                exit_reason: Optional[str] = None
                if tp > 0 and price >= p['entry_price'] * (1 + tp):
                    exit_reason = 'TP'
                elif sl > 0 and price <= p['entry_price'] * (1 - sl):
                    exit_reason = 'SL'
                elif atr_stop_mult > 0 and s.get('atr', 0) > 0 and price <= p['entry_price'] - atr_stop_mult * s['atr']:
                    exit_reason = 'ATR_SL'
                elif trailing_stop_pct > 0 and peak_price.get(pid, 0) > 0 and price <= peak_price[pid] * (1 - trailing_stop_pct):
                    exit_reason = 'TRAIL_SL'
                else:
                    # Exit policy: prefer the explicit exit_signals array
                    # (computed at a softer combine-mode than entry — see
                    # _build_exit_signals). This fixes the asymmetry where
                    # `combine_mode='any'` made the original strict 1→0
                    # crossing on the entry-combined array almost impossible
                    # to trigger, leaving accounts that bought and never sold.
                    exit_arr = s.get('exit_signals')
                    if exit_arr is not None and exit_arr[i] == 1:
                        exit_reason = 'signal'
                    else:
                        sig = s['signals'][i]
                        prev_sig = s['signals'][i - 1] if i > 0 else 0
                        if sig == 0 and prev_sig == 1:
                            exit_reason = 'signal'
                if exit_reason:
                    proceeds = p['shares'] * price * (1 - FEE_BPS)
                    pnl_abs = proceeds - p['shares'] * p['entry_price']
                    pnl_pct = (price / p['entry_price'] - 1) * 100 if p['entry_price'] else 0
                    cash += proceeds
                    c.execute('''UPDATE paper_positions SET status='closed',
                                 exit_price=?, exit_date=?, exit_reason=?,
                                 pnl_abs=?, pnl_pct=? WHERE id=?''',
                              (price, d, exit_reason, float(pnl_abs), float(pnl_pct), p['id']))
                    c.execute('''INSERT INTO paper_transactions
                                 (account_id, position_id, type, symbol, shares, price, value, fee, cash_after, reason, ts_date)
                                 VALUES (?, ?, 'sell', ?, ?, ?, ?, ?, ?, ?, ?)''',
                              (account_id, p['id'], sym, p['shares'], price,
                               float(p['shares'] * price), float(p['shares'] * price * FEE_BPS),
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
                                print(f"⚠️ Account {account_id} blacklisted {sym}: DD ${dd_dollars:.2f} / ${slice_est:.2f} = {dd_ratio:.2f}% (>= {sym_dd_stop_pct}%)")

            # 2) Check entries
            # NOTE: we deliberately do NOT require a strict 0->1 crossing here.
            # An active BUY signal (sig==1) is enough to enter when not already
            # holding. The "skip if already holding" check below prevents
            # double-buys, and the exit path still requires a strict 1->0 flip,
            # so the trade lifecycle stays clean. Strict crossing was the
            # source of the "0 transactions forever" symptom on AI-mode
            # accounts whose strategy signal turned on before account creation.
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
                # VIX gate: skip new entries on today's bar when VIX above threshold.
                # Apply only to current-day entries to avoid retroactively suppressing
                # historical replay decisions.
                if vix_block_entries and d == today_iso:
                    continue
                sig = s['signals'][i]
                if sig != 1:
                    continue
                # Skip if already holding this symbol
                already = c.execute(
                    "SELECT id FROM paper_positions WHERE account_id=? AND symbol=? AND status='open'",
                    (account_id, sym)).fetchone()
                if already:
                    continue
                price = float(s['closes'][i])

                # Position sizing: vol-target if enabled, else fixed pos_pct.
                # Vol-target weight = target_annualized_vol / symbol_realized_vol.
                # Capped at max_per_name_pct so a low-vol stock doesn't take 80%.
                if vol_target > 0:
                    sigma = _realized_vol_annual(s['closes'][:i + 1], 30)
                    if sigma > 0:
                        weight = min(vol_target / sigma, max_per_name_pct)
                        # Floor at a small allocation so very-low-vol names still get a sensible slice
                        weight = max(weight, 0.01)
                        slice_cash = float(a['initial_capital']) * weight
                    else:
                        slice_cash = cash * pos_pct
                else:
                    slice_cash = cash * pos_pct

                # Leverage cap: total deployed (positions @ current MTM + this trade) must not
                # exceed 100% of initial capital. Prevents pos_size_pct from silently
                # creating leveraged simulations.
                positions_mtm = 0.0
                for r in c.execute(
                    "SELECT symbol, shares FROM paper_positions WHERE account_id=? AND status='open'",
                    (account_id,)).fetchall():
                    s_held = series.get(r['symbol'])
                    if s_held and d in s_held['idx_by_date']:
                        positions_mtm += float(r['shares']) * float(s_held['closes'][s_held['idx_by_date'][d]])
                budget_left = max(0.0, float(a['initial_capital']) - positions_mtm)
                slice_cash = min(slice_cash, budget_left)

                # Per-name concentration cap: this single position cannot exceed
                # max_per_name_pct of initial capital at entry cost.
                per_name_cap = float(a['initial_capital']) * max_per_name_pct
                slice_cash = min(slice_cash, per_name_cap)

                if slice_cash <= 0:
                    continue

                # Round down to a valid board-lot multiple (1 for US, 100/500/1000/etc for HK)
                lot = _lot_size(sym)
                lots = int(slice_cash / (price * lot * (1 + FEE_BPS))) if price > 0 else 0
                shares = lots * lot
                if shares <= 0:
                    continue
                cost = shares * price * (1 + FEE_BPS)
                cash -= cost
                cur = c.execute('''INSERT INTO paper_positions
                             (account_id, symbol, shares, entry_price, entry_date, entry_reason, status)
                             VALUES (?, ?, ?, ?, ?, ?, 'open')''',
                          (account_id, sym, shares, price, d, 'signal'))
                pos_id = cur.lastrowid
                c.execute('''INSERT INTO paper_transactions
                             (account_id, position_id, type, symbol, shares, price, value, fee, cash_after, reason, ts_date)
                             VALUES (?, ?, 'buy', ?, ?, ?, ?, ?, ?, 'entry_signal', ?)''',
                          (account_id, pos_id, sym, shares, price,
                           float(shares * price), float(shares * price * FEE_BPS),
                           float(cash), d))
                new_tx += 1

            # 3) End-of-day equity snapshot
            positions_value = 0.0
            for r in c.execute(
                "SELECT symbol, shares FROM paper_positions WHERE account_id=? AND status='open'",
                (account_id,)).fetchall():
                s = series.get(r['symbol'])
                if not s or d not in s['idx_by_date']:
                    continue
                positions_value += r['shares'] * float(s['closes'][s['idx_by_date'][d]])
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
                        if not s or d not in s['idx_by_date']:
                            continue
                        ep = float(s['closes'][s['idx_by_date'][d]])
                        proceeds = p['shares'] * ep * (1 - FEE_BPS)
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
                                   float(p['shares'] * ep), float(p['shares'] * ep * FEE_BPS),
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
                    print(f"⛔ Account {account_id} auto-paused: {paused_msg}")
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
                        print(f"⚠️ drawdown alert send failed: {ne}")
                    return {
                        'success': True,
                        'account_id': account_id,
                        'days_processed': days_processed,
                        'new_transactions': new_tx,
                        'last_run_date': d,
                        'cash': cash,
                        'paused': True,
                        'paused_reason': paused_msg,
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
            print(f"⚠️ Paper tick notification failed for account {account_id}: {e}")

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
