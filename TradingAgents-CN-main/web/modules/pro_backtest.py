"""
Pro Strategy Backtester.

Supports multiple built-in strategies with full performance metrics:
- SMA crossover, EMA crossover
- RSI mean-reversion
- MACD signal
- Bollinger band reversion
- Donchian breakout (turtle-style)
- Buy & hold benchmark

Returns: equity curve, trade log, drawdown, Sharpe/Sortino/Calmar,
win rate, profit factor, average trade, expectancy, Monte Carlo robustness.
"""
from __future__ import annotations

import math
import random
import time
from typing import Any, Dict, List, Optional, Tuple


def _fetch(symbol: str, period: str = "5y") -> Optional[Tuple[List, List, List, List]]:
    try:
        import yfinance as yf
        h = yf.Ticker(symbol).history(period=period, interval="1d")
        if h is None or h.empty:
            return None
        # Drop the WHOLE row when Close is NaN (yfinance emits a NaN-close
        # placeholder bar for "today" outside US market hours). The old code
        # dropna()'d only the closes list, leaving dates/highs/lows one
        # element longer → IndexError in every consumer that zips them.
        h = h.dropna(subset=["Close"])
        if h.empty:
            return None
        dates = [d.strftime("%Y-%m-%d") for d in h.index]
        closes = list(h["Close"].values)
        highs = list(h["High"].values)
        lows = list(h["Low"].values)
        return dates, closes, highs, lows
    except Exception:
        return None


def _fetch_full(symbol: str, period: str = "5y") -> Optional[Tuple[List, List, List, List, List, List]]:
    """Like _fetch but also returns opens + volumes.

    Returns: (dates, opens, closes, highs, lows, volumes). All Lists, same length.

    Use when a caller needs RVOL (volume z-score), true VWAP, gap-and-go
    patterns, or ATR-trailing-stop logic that the 4-tuple _fetch doesn't
    expose. _fetch is preserved unchanged so the ~25 existing callers don't
    break — opt in to _fetch_full explicitly.
    """
    try:
        import yfinance as yf
        h = yf.Ticker(symbol).history(period=period, interval="1d")
        if h is None or h.empty:
            return None
        # Row-aligned NaN handling — see _fetch.
        h = h.dropna(subset=["Close"])
        if h.empty:
            return None
        dates = [d.strftime("%Y-%m-%d") for d in h.index]
        opens = list(h["Open"].values)
        closes = list(h["Close"].values)
        highs = list(h["High"].values)
        lows = list(h["Low"].values)
        volumes = list(h["Volume"].values) if "Volume" in h.columns else [0] * len(dates)
        return dates, opens, closes, highs, lows, volumes
    except Exception:
        return None


def _sma(values: List[float], n: int) -> List[Optional[float]]:
    out = [None] * len(values)
    s = 0.0
    for i, v in enumerate(values):
        s += v
        if i >= n:
            s -= values[i - n]
        if i >= n - 1:
            out[i] = s / n
    return out


def _ema(values: List[float], n: int) -> List[Optional[float]]:
    if not values:
        return []
    k = 2 / (n + 1)
    out = [None] * len(values)
    out[0] = values[0]
    for i in range(1, len(values)):
        out[i] = values[i] * k + out[i - 1] * (1 - k)
    return out


def _rsi(values: List[float], n: int = 14) -> List[Optional[float]]:
    out = [None] * len(values)
    if len(values) <= n:
        return out
    gains, losses = [], []
    for i in range(1, len(values)):
        diff = values[i] - values[i - 1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))
    avg_g = sum(gains[:n]) / n
    avg_l = sum(losses[:n]) / n
    out[n] = 100 - 100 / (1 + (avg_g / avg_l)) if avg_l else 100
    for i in range(n + 1, len(values)):
        avg_g = (avg_g * (n - 1) + gains[i - 1]) / n
        avg_l = (avg_l * (n - 1) + losses[i - 1]) / n
        out[i] = 100 - 100 / (1 + (avg_g / avg_l)) if avg_l else 100
    return out


def _macd(values, fast=12, slow=26, signal=9):
    ef = _ema(values, fast)
    es = _ema(values, slow)
    macd = [None if (ef[i] is None or es[i] is None) else ef[i] - es[i] for i in range(len(values))]
    valid = [m for m in macd if m is not None]
    sig = _ema(valid, signal)
    sig_full = [None] * (len(macd) - len(sig)) + sig
    return macd, sig_full


def _bbands(values: List[float], n: int = 20, k: float = 2.0):
    sma = _sma(values, n)
    upper, lower = [None] * len(values), [None] * len(values)
    for i in range(len(values)):
        if i < n - 1:
            continue
        slice_ = values[i - n + 1:i + 1]
        m = sum(slice_) / n
        sd = math.sqrt(sum((x - m) ** 2 for x in slice_) / n)
        upper[i] = m + k * sd
        lower[i] = m - k * sd
    return upper, lower


# ----- Strategies — return list of signals: 1=long, 0=flat, -1=short -----

def strat_sma_crossover(closes, fast=20, slow=50):
    sf = _sma(closes, fast)
    ss = _sma(closes, slow)
    sig = [0] * len(closes)
    for i in range(len(closes)):
        if sf[i] is None or ss[i] is None:
            continue
        sig[i] = 1 if sf[i] > ss[i] else 0
    return sig


def strat_ema_crossover(closes, fast=12, slow=26):
    sf = _ema(closes, fast)
    ss = _ema(closes, slow)
    sig = [0] * len(closes)
    for i in range(len(closes)):
        if sf[i] is None or ss[i] is None:
            continue
        sig[i] = 1 if sf[i] > ss[i] else 0
    return sig


def strat_rsi_meanrev(closes, n=14, low=30, high=70):
    rsi = _rsi(closes, n)
    sig = [0] * len(closes)
    in_pos = False
    for i in range(len(closes)):
        if rsi[i] is None:
            continue
        if not in_pos and rsi[i] < low:
            in_pos = True
        elif in_pos and rsi[i] > high:
            in_pos = False
        sig[i] = 1 if in_pos else 0
    return sig


def strat_macd(closes):
    macd, signal = _macd(closes)
    sig = [0] * len(closes)
    for i in range(len(closes)):
        if macd[i] is None or signal[i] is None:
            continue
        sig[i] = 1 if macd[i] > signal[i] else 0
    return sig


def strat_bbands_reversion(closes, n=20, k=2.0):
    upper, lower = _bbands(closes, n, k)
    sig = [0] * len(closes)
    in_pos = False
    for i in range(len(closes)):
        if upper[i] is None:
            continue
        if not in_pos and closes[i] < lower[i]:
            in_pos = True
        elif in_pos and closes[i] > upper[i]:
            in_pos = False
        sig[i] = 1 if in_pos else 0
    return sig


def strat_donchian(closes, highs, lows, n=20):
    sig = [0] * len(closes)
    in_pos = False
    for i in range(n, len(closes)):
        hi = max(highs[i - n:i])
        lo = min(lows[i - n:i])
        if not in_pos and closes[i] > hi:
            in_pos = True
        elif in_pos and closes[i] < lo:
            in_pos = False
        sig[i] = 1 if in_pos else 0
    return sig


def strat_buy_hold(closes):
    return [1] * len(closes)


STRATEGIES = {
    "sma_crossover": ("均線交叉 (20/50)", lambda c, h, l: strat_sma_crossover(c, 20, 50)),
    "sma_fast": ("快速均線 (10/30)", lambda c, h, l: strat_sma_crossover(c, 10, 30)),
    "ema_crossover": ("EMA 12/26 黃金交叉", lambda c, h, l: strat_ema_crossover(c, 12, 26)),
    "rsi_meanrev": ("RSI 均值回歸 (30/70)", lambda c, h, l: strat_rsi_meanrev(c)),
    "macd": ("MACD 趨勢策略", lambda c, h, l: strat_macd(c)),
    "bbands": ("布林帶回歸 (20,2)", lambda c, h, l: strat_bbands_reversion(c)),
    "donchian": ("Donchian 突破 (海龜)", lambda c, h, l: strat_donchian(c, h, l, 20)),
    "buy_hold": ("買入並持有", lambda c, h, l: strat_buy_hold(c)),
}


def _percentile(xs, q):
    if not xs:
        return 0
    s = sorted(xs)
    k = (len(s) - 1) * q
    f = math.floor(k)
    c = math.ceil(k)
    return s[int(k)] if f == c else s[f] * (c - k) + s[c] * (k - f)


def _backtest_signals(dates, closes, signals, initial_capital=10000.0,
                      fee_bps=5.0, slippage_bps=2.0):
    """Simulate signals → equity, trades."""
    cash = initial_capital
    shares = 0
    equity = []
    trades = []
    entry_price = 0
    entry_date = None
    fee = (fee_bps + slippage_bps) / 10000

    for i in range(len(closes)):
        prev_sig = signals[i - 1] if i > 0 else 0
        sig = signals[i]

        # State change → trade at this bar's close
        price = closes[i]
        if prev_sig == 0 and sig == 1:
            # Buy
            shares = (cash * (1 - fee)) / price
            cash = 0
            entry_price = price
            entry_date = dates[i]
        elif prev_sig == 1 and sig == 0 and shares > 0:
            # Sell
            cash = shares * price * (1 - fee)
            pnl = cash - (entry_price * shares * (1 + fee)) if entry_price else 0
            ret_pct = (price / entry_price - 1) * 100 if entry_price else 0
            trades.append({
                "entry_date": entry_date,
                "exit_date": dates[i],
                "entry_price": round(entry_price, 2),
                "exit_price": round(price, 2),
                "pnl": round(pnl, 2),
                "return_pct": round(ret_pct, 2),
                "win": pnl > 0,
            })
            shares = 0
            entry_price = 0

        equity.append(cash + shares * price)

    # Close any open position at end
    if shares > 0:
        price = closes[-1]
        cash = shares * price * (1 - fee)
        ret_pct = (price / entry_price - 1) * 100 if entry_price else 0
        trades.append({
            "entry_date": entry_date,
            "exit_date": dates[-1],
            "entry_price": round(entry_price, 2),
            "exit_price": round(price, 2),
            "pnl": round(cash - (entry_price * shares), 2),
            "return_pct": round(ret_pct, 2),
            "win": ret_pct > 0,
        })
        equity[-1] = cash
    return equity, trades


def _metrics(equity, trades, initial_capital, days, risk_free=0.04):
    if not equity:
        return {}
    final = equity[-1]
    total_ret = (final / initial_capital - 1) * 100
    years = max(days / 252, 0.1)
    cagr = ((final / initial_capital) ** (1 / years) - 1) * 100

    rets = []
    for i in range(1, len(equity)):
        if equity[i - 1] > 0:
            rets.append(equity[i] / equity[i - 1] - 1)

    if not rets:
        return {"total_return_pct": round(total_ret, 2), "trades": len(trades)}

    n = len(rets)
    mean = sum(rets) / n
    std = math.sqrt(sum((r - mean) ** 2 for r in rets) / max(n - 1, 1))
    sharpe = ((mean * 252) - risk_free) / (std * math.sqrt(252)) if std > 0 else 0
    downside = [r for r in rets if r < 0]
    dd_std = math.sqrt(sum(r * r for r in downside) / max(len(downside) - 1, 1)) if len(downside) > 1 else std
    sortino = ((mean * 252) - risk_free) / (dd_std * math.sqrt(252)) if dd_std > 0 else 0

    # Max DD
    peak = equity[0]
    max_dd = 0
    for v in equity:
        if v > peak:
            peak = v
        dd = (peak - v) / peak if peak else 0
        if dd > max_dd:
            max_dd = dd
    calmar = cagr / (max_dd * 100) if max_dd > 0 else 0

    # Trade stats
    wins = [t for t in trades if t["win"]]
    losses = [t for t in trades if not t["win"]]
    win_rate = (len(wins) / len(trades) * 100) if trades else 0
    avg_win = sum(t["return_pct"] for t in wins) / len(wins) if wins else 0
    avg_loss = sum(t["return_pct"] for t in losses) / len(losses) if losses else 0
    gross_profit = sum(t["pnl"] for t in wins)
    gross_loss = abs(sum(t["pnl"] for t in losses))
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else (gross_profit if gross_profit > 0 else 0)
    expectancy = (win_rate / 100 * avg_win + (1 - win_rate / 100) * avg_loss)

    return {
        "initial_capital": round(initial_capital, 2),
        "final_value": round(final, 2),
        "total_return_pct": round(total_ret, 2),
        "cagr_pct": round(cagr, 2),
        "sharpe_ratio": round(sharpe, 2),
        "sortino_ratio": round(sortino, 2),
        "calmar_ratio": round(calmar, 2),
        "max_drawdown_pct": round(max_dd * 100, 2),
        "volatility_pct": round(std * math.sqrt(252) * 100, 2),
        "trade_count": len(trades),
        "win_rate_pct": round(win_rate, 2),
        "avg_win_pct": round(avg_win, 2),
        "avg_loss_pct": round(avg_loss, 2),
        "profit_factor": round(profit_factor, 2),
        "expectancy_pct": round(expectancy, 3),
        "best_trade_pct": round(max((t["return_pct"] for t in trades), default=0), 2),
        "worst_trade_pct": round(min((t["return_pct"] for t in trades), default=0), 2),
    }


def _monte_carlo_robustness(trades: List[Dict], n_sims: int = 500) -> Dict[str, Any]:
    """Resample trade returns to gauge strategy robustness."""
    if not trades:
        return None
    rets = [t["return_pct"] / 100 for t in trades]
    finals = []
    for _ in range(n_sims):
        v = 1.0
        for _ in trades:
            v *= 1 + random.choice(rets)
        finals.append(v - 1)
    finals.sort()
    return {
        "simulations": n_sims,
        "p5_pct": round(_percentile(finals, 0.05) * 100, 2),
        "p50_pct": round(_percentile(finals, 0.50) * 100, 2),
        "p95_pct": round(_percentile(finals, 0.95) * 100, 2),
        "prob_loss_pct": round(sum(1 for x in finals if x < 0) / len(finals) * 100, 1),
    }


def list_strategies() -> List[Dict[str, str]]:
    return [{"id": k, "name": v[0]} for k, v in STRATEGIES.items()]


def run_backtest(symbol: str, strategy: str = "sma_crossover",
                 period: str = "5y", initial_capital: float = 10000.0,
                 fee_bps: float = 5.0) -> Dict[str, Any]:
    if strategy not in STRATEGIES:
        return {"success": False, "error": f"Unknown strategy: {strategy}"}

    data = _fetch(symbol, period)
    if not data:
        return {"success": False, "error": f"No data for {symbol}"}
    dates, closes, highs, lows = data
    if len(closes) < 60:
        return {"success": False, "error": "Not enough history"}

    name, fn = STRATEGIES[strategy]
    signals = fn(closes, highs, lows)

    equity, trades = _backtest_signals(dates, closes, signals, initial_capital, fee_bps)
    bh_eq, _ = _backtest_signals(dates, closes, [1] * len(closes), initial_capital, 0)

    metrics = _metrics(equity, trades, initial_capital, len(closes))
    bh_metrics = _metrics(bh_eq, [], initial_capital, len(closes))

    # Sample equity curve (every 5 days)
    step = max(1, len(dates) // 200)
    curve = [
        {"date": dates[i], "value": round(equity[i], 2), "buy_hold": round(bh_eq[i], 2)}
        for i in range(0, len(dates), step)
    ]
    if curve and curve[-1]["date"] != dates[-1]:
        curve.append({
            "date": dates[-1], "value": round(equity[-1], 2), "buy_hold": round(bh_eq[-1], 2)
        })

    mc = _monte_carlo_robustness(trades)

    return {
        "success": True,
        "symbol": symbol.upper(),
        "strategy": strategy,
        "strategy_name": name,
        "period": period,
        "metrics": metrics,
        "buy_hold_metrics": bh_metrics,
        "outperformance_pct": round((metrics.get("total_return_pct", 0) - bh_metrics.get("total_return_pct", 0)), 2),
        "equity_curve": curve,
        "trades": trades[-50:],  # last 50 trades
        "monte_carlo": mc,
        "available_strategies": list_strategies(),
    }
