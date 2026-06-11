"""
Auto-Trade Simulator — multi-symbol backtest with TP/SL + position sizing.

Reuses indicator helpers from pro_backtest. Strategies map onto the existing
single-symbol strategy functions when possible. Returns an equity curve, a
unified trade log, and aggregate metrics for the dashboard.
"""
from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

try:
    from modules.pro_backtest import (
        _fetch, _sma,
        strat_sma_crossover,
        strat_rsi_meanrev, strat_macd, strat_donchian,
    )
except Exception:
    from web.modules.pro_backtest import (  # type: ignore
        _fetch, _sma,
        strat_sma_crossover,
        strat_rsi_meanrev, strat_macd, strat_donchian,
    )


def _signals_momentum(closes: List[float], lookback: int = 60) -> List[int]:
    """Long when price > price[lookback days ago] AND above MA50."""
    out = [0] * len(closes)
    ma50 = _sma(closes, 50)
    for i in range(lookback, len(closes)):
        if ma50[i] is None:
            continue
        ret = (closes[i] - closes[i - lookback]) / closes[i - lookback] if closes[i - lookback] else 0
        out[i] = 1 if (ret > 0.05 and closes[i] > ma50[i]) else 0
    return out


def _build_signals(strategy: str, closes, highs, lows) -> List[int]:
    if strategy == 'ma_cross':
        return strat_sma_crossover(closes, 5, 20)
    if strategy == 'rsi_meanreversion':
        return strat_rsi_meanrev(closes, 14, 30, 70)
    if strategy == 'macd_cross':
        return strat_macd(closes)
    if strategy == 'breakout':
        return strat_donchian(closes, highs, lows, 20)
    if strategy == 'momentum':
        return _signals_momentum(closes, 60)
    # default
    return strat_sma_crossover(closes, 5, 20)


def _combine_signals(strategies: List[str], combine_mode: str,
                     closes, highs, lows) -> List[int]:
    """Combine multiple strategies' signals using any/majority/all logic."""
    if not strategies:
        return [0] * len(closes)
    if len(strategies) == 1:
        return _build_signals(strategies[0], closes, highs, lows)

    sigs = [_build_signals(s, closes, highs, lows) for s in strategies]
    out = [0] * len(closes)
    threshold_map = {'any': 1, 'majority': (len(sigs) // 2) + 1, 'all': len(sigs)}
    threshold = threshold_map.get(combine_mode, 1)
    for i in range(len(closes)):
        votes = sum(1 for s in sigs if i < len(s) and s[i] == 1)
        out[i] = 1 if votes >= threshold else 0
    return out


def _simulate_symbol(symbol: str, plan: Dict[str, Any], capital_slice: float,
                     slice_range=None) -> Dict[str, Any]:
    period = plan.get('period', '1y')
    data = _fetch(symbol, period)
    if not data:
        return {'symbol': symbol, 'success': False, 'error': 'no data', 'equity': [], 'trades': []}
    dates, closes, highs, lows = data
    if len(closes) < 60:
        return {'symbol': symbol, 'success': False, 'error': 'history < 60d', 'equity': [], 'trades': []}

    # Optional slice for walk-forward — slice_range = (start_pct, end_pct) in [0,1]
    if slice_range:
        n = len(closes)
        i0 = max(0, int(n * float(slice_range[0])))
        i1 = min(n, int(n * float(slice_range[1])))
        if i1 - i0 < 60:
            return {'symbol': symbol, 'success': False, 'error': 'sliced range too short', 'equity': [], 'trades': []}
        dates = dates[i0:i1]
        closes = closes[i0:i1]
        highs = highs[i0:i1]
        lows = lows[i0:i1]

    # Mirror the LIVE engine's per-trade mechanics so the optimizer scores the
    # same game production actually trades (autotrade_sim ↔ paper_trading parity):
    #   - level-triggered entry (sig==1), not an edge cross
    #   - real fee + half-spread + slippage via total_transaction_cost_bps
    #   - gap-aware SL / ATR-stop / trailing-stop / TP via the shared _select_exit
    #   - soft signal exit via _build_exit_signals (same softening live uses)
    #   - profit-taking ladder, min-trade-value floor, post-close cooldown
    #
    # NOT modeled here: account/market-level gates (VIX / HMM / MTF / VWAP /
    # earnings / sector caps) — those live in the day-major account loop and
    # only SUPPRESS trades, so omitting them is a documented, conservative
    # residual (the optimizer may see slightly more trades than live).
    #
    # Fill timing (P1a): plan['fill_mode'] selects between the legacy same-bar
    # fill ('same_close', default when absent — pre-fix accounts) and the
    # honest lagged fill ('next_close': act on bar i-1's signal at bar i's
    # close). The SAME flag drives the live engine's lag in
    # paper_trading._run_account_tick_impl so the two engines never drift.
    try:
        from .paper_trading import (
            _lot_size, _atr, total_transaction_cost_bps, _build_exit_signals,
            _select_exit, _DEFAULT_MIN_TRADE_VALUE, _DEFAULT_HOLD_COOLDOWN_DAYS,
        )
    except Exception:  # pragma: no cover - import path shim
        from web.modules.paper_trading import (  # type: ignore
            _lot_size, _atr, total_transaction_cost_bps, _build_exit_signals,
            _select_exit, _DEFAULT_MIN_TRADE_VALUE, _DEFAULT_HOLD_COOLDOWN_DAYS,
        )

    raw_strats = plan.get('strategies') or plan.get('strategy') or 'ma_cross'
    if isinstance(raw_strats, str):
        strats = [s.strip() for s in raw_strats.split(',') if s.strip()]
    else:
        strats = [s for s in raw_strats if s]
    combine_mode = (plan.get('combine_mode') or 'any').lower()
    if combine_mode not in ('any', 'majority', 'all'):
        combine_mode = 'any'
    signals = _combine_signals(strats, combine_mode, closes, highs, lows)
    exit_signals = _build_exit_signals(strats, combine_mode, closes, highs, lows)

    tp = (plan.get('take_profit_pct') or 0) / 100.0
    sl = (plan.get('stop_loss_pct') or 0) / 100.0
    atr_stop_mult = float(plan.get('atr_stop_mult') or 0)
    trailing_stop_pct = float(plan.get('trailing_stop_pct') or 0) / 100.0
    ladder_pcts = list(plan.get('profit_ladder_pct') or [])
    ladder_trim = list(plan.get('ladder_trim_fractions') or [])
    ladder_steps = min(len(ladder_pcts), len(ladder_trim))
    min_trade_value = float(plan.get('min_trade_value') or _DEFAULT_MIN_TRADE_VALUE)
    _hc = plan.get('hold_cooldown_days', _DEFAULT_HOLD_COOLDOWN_DAYS)
    hold_cooldown_days = int(_hc) if _hc is not None else _DEFAULT_HOLD_COOLDOWN_DAYS
    # P1a fill timing — see the parity note above. Lag of 1 bar in
    # next_close mode; 0 preserves the legacy same-bar fill.
    fill_mode = (plan.get('fill_mode') or 'same_close').lower()
    sig_lag = 1 if fill_mode == 'next_close' else 0
    lot = _lot_size(symbol)
    atr_val = _atr(highs, lows, closes, 14) if atr_stop_mult > 0 else 0.0

    def _sell_proceeds(shares: int, fill: float) -> float:
        sell_value = shares * fill
        return sell_value * (1 - total_transaction_cost_bps(symbol, 'sell', sell_value))

    equity_series: List[Dict[str, Any]] = []
    trades: List[Dict[str, Any]] = []
    cash = capital_slice
    position = 0  # share count
    entry_price = 0.0
    entry_date = ''
    peak = 0.0           # high-water mark for the trailing stop
    partial_done = 0     # ladder steps already trimmed on the open position
    cooldown_until = -1  # bar index; new entries blocked while i <= cooldown_until

    for i, d in enumerate(dates):
        price = closes[i]
        bar_high = highs[i] if i < len(highs) else price
        bar_low = lows[i] if i < len(lows) else price

        # --- exits on the open position (processed before entries, like live) ---
        if position > 0:
            if trailing_stop_pct > 0:
                peak = max(peak, price)
            post_ladder = ladder_steps > 0 and partial_done >= ladder_steps
            tp_level = (entry_price * (1 + tp)) if (tp > 0 and not post_ladder) else None
            sl_level = (entry_price * (1 - sl)) if sl > 0 else None
            atr_sl_level = (entry_price - atr_stop_mult * atr_val) if (
                atr_stop_mult > 0 and atr_val > 0) else None
            trail_level = (peak * (1 - trailing_stop_pct)) if (
                trailing_stop_pct > 0 and peak > 0) else None

            # Profit-taking ladder — one trim per bar (mirrors live T17D). Fire
            # before the regular exit check so a runner trims instead of fully
            # closing on the static TP.
            laddered = False
            if (tp > 0 and ladder_steps > 0 and partial_done < ladder_steps
                    and tp_level is not None):
                step_target = entry_price * (1 + tp * float(ladder_pcts[partial_done]))
                if bar_high >= step_target:
                    trim_shares = int(position * float(ladder_trim[partial_done]))
                    if 0 < trim_shares < position:
                        cash += _sell_proceeds(trim_shares, step_target)
                        pnl_pct = (step_target / entry_price - 1) * 100 if entry_price else 0
                        trades.append({
                            'symbol': symbol, 'entry_date': entry_date,
                            'entry_price': float(round(entry_price, 4)),
                            'exit_date': d, 'exit_price': float(round(step_target, 4)),
                            'pnl_pct': float(round(pnl_pct, 3)),
                            'exit_reason': f'ladder_trim_{partial_done + 1}',
                        })
                        position -= trim_shares
                        partial_done += 1
                        laddered = True

            if not laddered:
                _j = i - sig_lag
                exit_now = (_j >= 0 and exit_signals[_j] == 1) or (
                    _j > 0 and signals[_j] == 0 and signals[_j - 1] == 1)
                reason, fill = _select_exit(
                    price, bar_high, bar_low,
                    sl_level=sl_level, atr_sl_level=atr_sl_level,
                    trail_level=trail_level, tp_level=tp_level,
                    exit_signal_now=exit_now)
                if reason:
                    cash += _sell_proceeds(position, fill)
                    pnl_pct = (fill / entry_price - 1) * 100 if entry_price else 0
                    trades.append({
                        'symbol': symbol, 'entry_date': entry_date,
                        'entry_price': float(round(entry_price, 4)),
                        'exit_date': d, 'exit_price': float(round(fill, 4)),
                        'pnl_pct': float(round(pnl_pct, 3)),
                        'exit_reason': reason,
                    })
                    position = 0
                    entry_price = 0.0
                    peak = 0.0
                    partial_done = 0
                    cooldown_until = i + hold_cooldown_days

        # --- entry: level-triggered, after exits on the same bar (like live) ---
        if (position == 0 and i >= sig_lag and signals[i - sig_lag] == 1
                and i > cooldown_until and price > 0):
            all_in_buy = total_transaction_cost_bps(symbol, 'buy', cash)
            lots = int(cash / (price * lot * (1 + all_in_buy)))
            shares = lots * lot
            trade_value = shares * price
            if shares > 0 and trade_value >= min_trade_value:
                cost = trade_value * (1 + total_transaction_cost_bps(symbol, 'buy', trade_value))
                if cost <= cash:
                    cash -= cost
                    position = shares
                    entry_price = price
                    entry_date = d
                    peak = price
                    partial_done = 0

        equity_series.append({'date': d, 'value': round(cash + position * price, 2)})

    # close any open position at the last bar (end-of-period)
    if position > 0:
        last_price = closes[-1]
        pnl_pct = (last_price / entry_price - 1) * 100 if entry_price else 0
        trades.append({
            'symbol': symbol,
            'entry_date': entry_date, 'entry_price': float(round(entry_price, 4)),
            'exit_date': dates[-1], 'exit_price': float(round(last_price, 4)),
            'pnl_pct': float(round(pnl_pct, 3)),
            'exit_reason': 'EOP',
        })
        cash += _sell_proceeds(position, last_price)
        position = 0

    # Buy-and-hold of this symbol over the same (sliced) window — the
    # per-symbol benchmark the optimizer scores alpha against. Free: computed
    # from price data we already fetched, no extra network call.
    buyhold_pct = ((closes[-1] / closes[0] - 1.0) * 100.0) if closes and closes[0] else 0.0

    return {
        'symbol': symbol,
        'success': True,
        'equity': [{'date': p['date'], 'value': float(p['value'])} for p in equity_series],
        'trades': trades,
        'final_equity': float(round(cash, 2)),
        'buyhold_pct': float(round(buyhold_pct, 3)),
    }


def _aggregate_metrics(equity_curve: List[Dict[str, Any]], trades: List[Dict[str, Any]],
                       initial_capital: float) -> Dict[str, Any]:
    if not equity_curve:
        return {'total_return_pct': 0, 'win_rate': 0, 'max_drawdown_pct': 0, 'sharpe': 0, 'trade_count': 0}

    final = equity_curve[-1]['equity']
    total_ret = (final / initial_capital - 1) * 100 if initial_capital else 0

    # Drawdown
    peak = -1e18
    max_dd = 0.0
    for p in equity_curve:
        peak = max(peak, p['equity'])
        if peak > 0:
            dd = (peak - p['equity']) / peak * 100
            max_dd = max(max_dd, dd)

    # Daily returns → Sharpe
    rets: List[float] = []
    for i in range(1, len(equity_curve)):
        prev = equity_curve[i - 1]['equity']
        cur = equity_curve[i]['equity']
        if prev > 0:
            rets.append((cur - prev) / prev)
    if len(rets) > 5:
        mean = sum(rets) / len(rets)
        var = sum((r - mean) ** 2 for r in rets) / len(rets)
        std = math.sqrt(var)
        sharpe = (mean / std * math.sqrt(252)) if std > 0 else 0.0
    else:
        sharpe = 0.0

    wins = sum(1 for t in trades if t['pnl_pct'] > 0)
    win_rate = (wins / len(trades) * 100) if trades else 0

    return {
        'total_return_pct': float(round(total_ret, 3)),
        'win_rate': float(round(win_rate, 2)),
        'max_drawdown_pct': float(round(max_dd, 3)),
        'sharpe': float(round(sharpe, 3)),
        'trade_count': len(trades),
        'final_equity': float(round(final, 2)),
    }


_PERIOD_DAYS = {'3mo': 90, '6mo': 182, '1y': 365, '2y': 730, '5y': 1825}


def _period_to_days(p: str) -> int:
    return _PERIOD_DAYS.get((p or '1y').lower(), 365)


def _annualize_pct(total_pct: float, days: int) -> float:
    """Convert period total return % to annualized %."""
    if days <= 0:
        return 0.0
    factor = (1.0 + total_pct / 100.0)
    if factor <= 0:
        return -100.0
    annual = factor ** (365.0 / days) - 1.0
    return annual * 100.0


# Weight on alpha vs buy-and-hold. The benchmark is ~constant across the
# candidates of a single optimize_plan run (same symbols/window), so this term
# mainly (a) amplifies the weight on annual return and (b) drives cash-sitting
# plans (annual≈0 while the benchmark rose) to a negative score — which is the
# point: a "trading" product that underperforms idle buy-and-hold is not
# marketable, so the optimizer must stop selecting it.
_ALPHA_WEIGHT = 0.5


def _score_components(annual, dd, sharpe, total_ret_pct, trade_count,
                      target_annual_pct, benchmark_annual_pct=0.0):
    """The single source of truth for the fitness score, shared by the
    optimizer backtest (_score_result) and the live realized-equity scorer
    (paper_trading._live_fitness) so the two can never drift. Inputs are
    already-computed metrics (each caller annualizes in its own day convention);
    this only combines them.

    score = annual - 0.5*dd + 2*sharpe + alpha*(annual - benchmark)
            + 15 (hit target) - 20 (losing) - 10 (< 3 trades, unreliable)
    """
    score = annual - 0.5 * dd + 2.0 * sharpe
    score += _ALPHA_WEIGHT * (annual - benchmark_annual_pct)
    if annual >= target_annual_pct:
        score += 15  # bonus for hitting target
    if total_ret_pct < 0:
        score -= 20  # heavy penalty for losing money
    if trade_count < 3:
        score -= 10  # too few trades = unreliable signal
    return round(score, 3)


def _score_result(metrics, days, target_annual_pct):
    """Higher = better. Combines annualized return, drawdown, Sharpe, target hit,
    and alpha vs the basket's buy-and-hold over the same window."""
    total_ret = metrics.get('total_return_pct', 0)
    annual = _annualize_pct(total_ret, days)
    dd = metrics.get('max_drawdown_pct', 100)
    sharpe = metrics.get('sharpe', 0) or 0
    trade_count = metrics.get('trade_count', 0)
    # Annualize the basket buy-and-hold with the SAME `days` so the alpha term
    # compares like-for-like.
    benchmark_annual = _annualize_pct(metrics.get('benchmark_total_pct', 0) or 0, days)

    score = _score_components(annual, dd, sharpe, total_ret, trade_count,
                              target_annual_pct, benchmark_annual_pct=benchmark_annual)
    return score, round(annual, 3)


_ALL_STRATEGIES = ['ma_cross', 'rsi_meanreversion', 'macd_cross', 'breakout', 'momentum']

# P1b — multiple-testing deflation. The expected maximum of N independent
# noise scores with spread σ is ≈ σ·sqrt(2·ln N), so subtracting exactly that
# (λ=1) from the winner estimates its selection bias: a "best" config found by
# searching N configs over pure noise deflates back to roughly the mean.
_DEFLATE_LAMBDA = 1.0


def _deflate_penalty(scores, n_evals):
    """Selection-bias penalty for picking the max of ``n_evals`` trials whose
    final scores are ``scores``. Returns 0 when there's nothing to deflate."""
    valid = [s for s in scores if s is not None and s > -1e8]
    if len(valid) < 2 or n_evals < 2:
        return 0.0
    mean = sum(valid) / len(valid)
    var = sum((s - mean) ** 2 for s in valid) / len(valid)
    spread = math.sqrt(var)
    return _DEFLATE_LAMBDA * spread * math.sqrt(2.0 * math.log(n_evals))


_EMBARGO_PCT = 0.02       # ~5 bars on a 1y window between train end / OOS start
_MIN_FOLD_BARS = 60       # _simulate_symbol refuses slices shorter than this
_MAX_OOS_FOLDS = 4


def oos_fold_slices(period_days: int, train_pct: float = 0.7):
    """P4 — contiguous purged OOS folds over the post-train window.

    Returns (train_slice, folds): train ends _EMBARGO_PCT before the first
    fold (the purge gap, so no training bar's forward window touches OOS),
    and the test region splits into as many >=_MIN_FOLD_BARS folds as fit
    (1 on a 1y window, 2 on 2y, 4 on 5y). Scoring on the MEAN across folds
    instead of one 70/30 split stops a single lucky test window from
    selecting the winner — the CPCV idea sized to this engine's constraint
    that every slice must be a contiguous >=60-bar run.
    """
    bars = max(1, int(period_days * 0.69))   # calendar days → ~trading bars
    test_frac = max(0.0, 1.0 - train_pct)
    test_bars = test_frac * bars
    k = max(1, min(_MAX_OOS_FOLDS, int(test_bars // _MIN_FOLD_BARS)))
    fold_frac = test_frac / k
    folds = [(round(train_pct + i * fold_frac, 4),
              round(train_pct + (i + 1) * fold_frac, 4)) for i in range(k)]
    train_slice = (0.0, round(max(0.1, train_pct - _EMBARGO_PCT), 4))
    return train_slice, folds


def score_plan_oos(base_plan, target_annual_pct, period_days,
                   train_pct: float = 0.7):
    """Score a plan as the MEAN deflated-comparable score across the purged
    OOS folds (the same folds optimize_plan validates with — champion and
    challengers must be judged on identical data)."""
    _train, folds = oos_fold_slices(period_days, train_pct)
    fold_days = max(1, int(period_days * (folds[0][1] - folds[0][0])))
    scores, annuals, metrics = [], [], {}
    for sl in folds:
        res = simulate_plan(base_plan, slice_range=sl)
        if not res.get('success'):
            continue
        s, a = _score_result(res['metrics'], fold_days, target_annual_pct)
        scores.append(s)
        annuals.append(a)
        metrics = res['metrics']  # keep the latest fold's detail for display
    if not scores:
        return {'score': -1e9, 'annual_return_pct': 0.0, 'metrics': {},
                'n_folds': 0}
    return {'score': sum(scores) / len(scores),
            'annual_return_pct': sum(annuals) / len(annuals),
            'metrics': metrics, 'n_folds': len(scores),
            'fold_scores': [round(s, 3) for s in scores]}


def optimize_plan(base_plan, target_monthly_pct=5.0, max_iterations=60,
                  walk_forward=False, train_pct=0.7,
                  expand_search=False, rng_seed=None, trial_sink=None):
    """
    Random + local-refinement search over the strategy / TP / SL space.
    Scores configs against an annualized return target derived from the
    user's monthly target (default 5%/month → ~79.6%/year compounded).

    SEARCH SPACE (audit finding #17): by default the search REFINES within
    the strategies the user already picked in base_plan['strategies'] —
    previously this was ignored and the optimizer always explored all 5
    strategies, which could recommend something the user explicitly
    declined. Set ``expand_search=True`` to opt into the broader 5-strategy
    hunt when the user wants the agent to discover unfamiliar territory.

    SEED (audit finding #20): the old hardcoded seed=42 meant every account
    explored the SAME 60 configs in the SAME order, so two accounts on
    different symbols would converge on the same "lucky" config. Now
    ``rng_seed`` is configurable; pass an account_id or time.time() for
    independent searches. Default 42 retained ONLY when caller doesn't
    specify, to keep current tests deterministic.

    walk_forward=True splits the period into train / test:
      - Search runs on the first `train_pct` of bars (in-sample).
      - Top-K candidates get re-run on the remaining (1-train_pct) (OOS).
      - Final ranking uses the OOS score so winners generalize.

    TRIAL LOGGING (P1b): pass ``trial_sink`` (a callable taking one dict) to
    receive a record for EVERY configuration evaluated — config, train score,
    OOS score (when walk-forward re-ran it), annual %, trade count, slices.
    evolve_account_plan persists these to the optimizer_trials table so the
    deflated score below can be audited. Sink errors are swallowed; logging
    must never break the search.

    DEFLATED SCORE (P1b): every returned candidate carries ``score_deflated``
    = score − λ·σ·sqrt(2·ln N_evals), the expected-max-of-N selection-bias
    correction. Rankings within one run are unchanged (constant penalty);
    consumers comparing across runs or against a non-searched baseline (the
    live champion in evolve_account_plan) must use the DEFLATED score so
    over-searched configs stop auto-promoting.

    Returns: {success, target_monthly_pct, target_annual_pct, best, top,
             trials_count, walk_forward, search_space, deflation}
    """
    import random as _rand

    target_annual = round(((1.0 + target_monthly_pct / 100.0) ** 12 - 1.0) * 100.0, 2)
    days = _period_to_days(base_plan.get('period', '1y'))
    # P4 — purged train window + K contiguous OOS folds (K adapts to the
    # period; 1 on 1y, up to 4 on 5y). OOS rank = mean across folds.
    if walk_forward:
        train_slice, oos_folds = oos_fold_slices(days, train_pct)
        test_slice = (train_pct, 1.0)  # kept for the trial-log slice record
    else:
        train_slice, oos_folds, test_slice = None, [], None
    train_days = int(days * train_pct) if walk_forward else days
    test_days = days - train_days if walk_forward else days

    # Deterministic by default for reproducible tests; per-account seed
    # eliminates the cross-account correlation we saw in the audit.
    rng = _rand.Random(42 if rng_seed is None else int(rng_seed))

    # Honor the user's strategy picks in refine mode. Sanitize against the
    # known set so a stale plan with a renamed strategy can't crash the
    # search. If after filtering nothing remains, fall back to ALL.
    user_strats = base_plan.get('strategies') or []
    if isinstance(user_strats, str):
        user_strats = [s.strip() for s in user_strats.split(',') if s.strip()]
    user_strats = [s for s in user_strats if s in _ALL_STRATEGIES]

    if expand_search or not user_strats:
        strategies = list(_ALL_STRATEGIES)
        search_space_kind = 'expand_full'
    else:
        strategies = user_strats
        search_space_kind = 'refine_user_picks'
    combine_modes = ['any', 'majority', 'all']
    tp_choices = [5, 8, 10, 12, 15, 20, 25]
    sl_choices = [3, 5, 7, 10, 12, 15]
    pos_choices = [10, 15, 20, 30, 50]

    trials = []
    eval_log = []  # P1b — one record per evaluated config, emitted to trial_sink

    def try_config(strats, combine, tp, sl, pos):
        plan = dict(base_plan)
        plan.pop('strategy', None)
        plan['strategies'] = strats
        plan['combine_mode'] = combine
        plan['take_profit_pct'] = tp
        plan['stop_loss_pct'] = sl
        plan['pos_size_pct'] = pos
        result = simulate_plan(plan, slice_range=train_slice)
        if not result.get('success'):
            return None
        score, annual = _score_result(result['metrics'], train_days, target_annual)
        rec = {
            'config': {'strategies': list(strats), 'combine_mode': combine,
                       'take_profit_pct': tp, 'stop_loss_pct': sl,
                       'pos_size_pct': pos},
            'train_score': score,
            'oos_score': None,
            'annual_pct': annual,
            'n_trades': int(result['metrics'].get('trade_count') or 0),
            'slice': {'train': train_slice, 'test': test_slice},
        }
        eval_log.append(rec)
        return {
            '_trial_rec': rec,
            'plan': {
                'strategies': strats,
                'combine_mode': combine,
                'take_profit_pct': tp,
                'stop_loss_pct': sl,
                'pos_size_pct': pos,
                'period': plan.get('period'),
                'symbols': plan.get('symbols'),
                'capital': plan.get('capital'),
            },
            'metrics': result['metrics'],
            'annual_return_pct': annual,
            'score': score,
            'hit_target': annual >= target_annual,
        }

    def try_config_oos(p):
        """Re-run a candidate plan on the purged OOS folds; mean score wins
        (P4 — one lucky window can no longer select the champion)."""
        plan = dict(base_plan)
        plan.update(p)
        oos = score_plan_oos(plan, target_annual, days, train_pct=train_pct)
        if oos['n_folds'] == 0:
            return None
        return {
            'metrics': oos['metrics'],
            'annual_return_pct': oos['annual_return_pct'],
            'score': oos['score'],
            'n_folds': oos['n_folds'],
            'fold_scores': oos.get('fold_scores'),
            'hit_target': oos['annual_return_pct'] >= target_annual,
        }

    # Phase 1: random sampling
    for _ in range(max_iterations):
        n_strats = rng.randint(1, min(3, len(strategies)))
        chosen = rng.sample(strategies, n_strats)
        cfg = (chosen,
               rng.choice(combine_modes) if n_strats > 1 else 'any',
               rng.choice(tp_choices),
               rng.choice(sl_choices),
               rng.choice(pos_choices))
        out = try_config(*cfg)
        if out:
            trials.append(out)

    if not trials:
        return {'success': False, 'error': '所有組合均無有效訊號，請調整標的或期間'}

    # Phase 2: local refinement around top 3
    trials.sort(key=lambda t: -t['score'])
    seeds = trials[:3]
    for seed in seeds:
        sp = seed['plan']
        # Try perturbed TP/SL near the seed
        for dtp in (-3, -1, 1, 3):
            for dsl in (-2, -1, 1, 2):
                tp = max(2, sp['take_profit_pct'] + dtp)
                sl = max(1, sp['stop_loss_pct'] + dsl)
                if tp == sp['take_profit_pct'] and sl == sp['stop_loss_pct']:
                    continue
                out = try_config(
                    sp['strategies'], sp['combine_mode'],
                    tp, sl, sp['pos_size_pct'])
                if out:
                    trials.append(out)

    trials.sort(key=lambda t: -t['score'])

    # Walk-forward: re-run top candidates on held-out data and re-rank by OOS
    if walk_forward and trials:
        candidates = trials[:8]
        for t in candidates:
            oos = try_config_oos(t['plan'])
            if oos:
                rec = t.get('_trial_rec')
                if rec is not None:
                    rec['oos_score'] = oos['score']
                t['in_sample'] = {
                    'score': t['score'],
                    'annual_return_pct': t['annual_return_pct'],
                    'metrics': t['metrics'],
                    'hit_target': t['hit_target'],
                }
                t['out_of_sample'] = oos
                t['score'] = oos['score']  # rank by OOS
                t['annual_return_pct'] = oos['annual_return_pct']
                t['metrics'] = oos['metrics']
                t['hit_target'] = oos['hit_target']
            else:
                # Failed to validate — push to bottom
                t['out_of_sample'] = None
                t['score'] = -1e9
        candidates.sort(key=lambda t: -t['score'])
        # Drop any that failed OOS
        trials = [t for t in candidates if t.get('out_of_sample')]
        # Append remaining un-validated trials so the list isn't empty if all failed
        if not trials:
            trials = candidates

    # P1b — selection-bias correction over EVERYTHING evaluated this run.
    # σ comes from the final (OOS-reranked where available) candidate scores;
    # N is the count of configs actually tried, not just the survivors.
    n_evals = len(eval_log)
    penalty = _deflate_penalty([t.get('score') for t in trials], n_evals)
    for t in trials:
        t['score_deflated'] = round(float(t['score']) - penalty, 3)
        t.pop('_trial_rec', None)  # internal bookkeeping — keep output JSON-clean

    if trial_sink is not None:
        for rec in eval_log:
            try:
                trial_sink(rec)
            except Exception:
                pass  # logging must never break the search

    best = trials[0] if trials else None
    return {
        'success': True,
        'target_monthly_pct': target_monthly_pct,
        'target_annual_pct': target_annual,
        'period': base_plan.get('period'),
        'period_days': days,
        'trials_count': len(trials),
        'best': best,
        'top': trials[:5],
        'hit_target_count': sum(1 for t in trials if t.get('hit_target')),
        'walk_forward': walk_forward,
        'train_pct': train_pct if walk_forward else None,
        'deflation': {
            'n_evals': n_evals,
            'penalty': round(penalty, 3),
            'lambda': _DEFLATE_LAMBDA,
        },
        'search_space': {
            'kind': search_space_kind,
            'strategies': strategies,
            'expand_search': expand_search,
            'rng_seed': 42 if rng_seed is None else int(rng_seed),
        },
    }


_STRATEGY_DESCRIPTIONS = {
    'ma_cross': '5/20 移動均線黃金交叉 — 適合穩定的趨勢市場',
    'rsi_meanreversion': 'RSI(14) <30 買、>70 賣 — 適合震盪/盤整市場',
    'macd_cross': 'MACD 金叉/死叉 — 適合中期趨勢轉折',
    'breakout': '20 日 Donchian 突破 — 適合強勢突破/海龜系統',
    'momentum': '60 日動能 + MA50 過濾 — 適合明顯趨勢/強勢股',
}


def recommend_strategy(symbols: List[str]) -> Dict[str, Any]:
    """
    Use real OHLCV regime detection + LLM (if available) to recommend a strategy
    or set of strategies for the given symbols.

    Returns: {success, recommended_strategies: [...], combine_mode, rationale, regime}
    """
    if isinstance(symbols, str):
        symbols = [s.strip().upper() for s in symbols.split(',') if s.strip()]
    symbols = symbols[:5] or ['SPY']

    # Per-symbol regime: trend strength via MA slope, volatility via stdev
    regimes = []
    for sym in symbols:
        data = _fetch(sym, '6mo')
        if not data:
            continue
        dates, closes, highs, lows = data
        if len(closes) < 60:
            continue
        ma20 = _sma(closes, 20)
        ma60 = _sma(closes, 60)
        last_close = closes[-1]
        ma20v = ma20[-1] if ma20[-1] is not None else last_close
        ma60v = ma60[-1] if ma60[-1] is not None else last_close
        # Trend = % distance MA20 above MA60 (positive = uptrend)
        trend = ((ma20v - ma60v) / ma60v * 100) if ma60v else 0
        # Volatility = stdev of last-30 daily returns, annualized
        rets = []
        for i in range(1, min(31, len(closes))):
            if closes[-i - 1] > 0:
                rets.append((closes[-i] - closes[-i - 1]) / closes[-i - 1])
        if len(rets) > 1:
            mean_r = sum(rets) / len(rets)
            var_r = sum((r - mean_r) ** 2 for r in rets) / len(rets)
            vol_pct = (var_r ** 0.5) * (252 ** 0.5) * 100
        else:
            vol_pct = 20.0
        regimes.append({
            'symbol': sym,
            'last_price': round(float(last_close), 2),
            'trend_pct': round(float(trend), 2),
            'vol_pct': round(float(vol_pct), 2),
        })

    # Aggregate regime
    avg_trend = (sum(r['trend_pct'] for r in regimes) / len(regimes)) if regimes else 0
    avg_vol = (sum(r['vol_pct'] for r in regimes) / len(regimes)) if regimes else 25.0

    # Heuristic recommendation
    if avg_trend > 3 and avg_vol < 35:
        rec = ['momentum', 'ma_cross']
        combine = 'majority'
        regime_label = '強勢上升趨勢 + 中低波動'
    elif avg_trend > 3 and avg_vol >= 35:
        rec = ['breakout', 'momentum']
        combine = 'any'
        regime_label = '強勢上升 + 高波動'
    elif abs(avg_trend) <= 1 and avg_vol >= 25:
        rec = ['rsi_meanreversion']
        combine = 'any'
        regime_label = '盤整 + 高波動 (適合均值回歸)'
    elif abs(avg_trend) <= 3:
        rec = ['macd_cross', 'rsi_meanreversion']
        combine = 'majority'
        regime_label = '溫和震盪 (混合策略)'
    elif avg_trend < -3:
        rec = ['rsi_meanreversion']
        combine = 'any'
        regime_label = '下行趨勢 (謹慎反彈策略)'
    else:
        rec = ['ma_cross']
        combine = 'any'
        regime_label = '混合 (預設均線策略)'

    # Try LLM rationale if available
    rationale = None
    try:
        from modules.pro_ai import _try_llm
        facts = (
            f"標的: {', '.join(symbols)}\n"
            f"平均趨勢 (MA20 vs MA60): {avg_trend:.2f}%\n"
            f"平均年化波動: {avg_vol:.1f}%\n"
            f"市場狀態: {regime_label}\n"
            f"系統推薦策略: {', '.join(rec)} (combine={combine})\n"
            f"\n可用策略:\n"
            + '\n'.join(f"- {k}: {v}" for k, v in _STRATEGY_DESCRIPTIONS.items())
        )
        prompt = (
            '請用 2-3 句繁體中文解釋為何上述策略組合適合這些標的。'
            '具體引用趨勢/波動數據，不要泛泛而談。\n\n' + facts
        )
        system = '你是量化策略分析師，回覆簡潔具體，使用繁體中文。'
        rationale = _try_llm(prompt, system=system)
    except Exception:
        pass
    if not rationale:
        rationale = (
            f'根據近 6 個月資料：平均趨勢 {avg_trend:+.2f}%、年化波動 {avg_vol:.1f}%，'
            f'判定為「{regime_label}」。建議採用 {", ".join(rec)} '
            f'（合併模式：{combine}），原因見策略說明。'
        )

    return {
        'success': True,
        'recommended_strategies': rec,
        'combine_mode': combine,
        'regime': {
            'label': regime_label,
            'avg_trend_pct': round(avg_trend, 2),
            'avg_vol_pct': round(avg_vol, 2),
            'per_symbol': regimes,
        },
        'rationale': rationale.strip() if rationale else '',
        'descriptions': _STRATEGY_DESCRIPTIONS,
    }


def simulate_plan(plan: Dict[str, Any], slice_range=None) -> Dict[str, Any]:
    """Run a multi-symbol backtest from a plan dict."""
    symbols_raw = plan.get('symbols') or ''
    if isinstance(symbols_raw, list):
        symbols = [s.strip().upper() for s in symbols_raw if s and s.strip()]
    else:
        symbols = [s.strip().upper() for s in str(symbols_raw).split(',') if s.strip()]
    symbols = symbols[:5]
    if not symbols:
        return {'success': False, 'error': '至少需要一個股票代碼'}

    capital = float(plan.get('capital') or 10000)
    pos_pct = max(1.0, min(100.0, float(plan.get('pos_size_pct') or 20)))
    capital_slice = capital * (pos_pct / 100.0)

    per_symbol = []
    for sym in symbols:
        per_symbol.append(_simulate_symbol(sym, plan, capital_slice, slice_range=slice_range))

    # Combine: equity = remaining cash + sum of per-symbol equities (above their slice baseline)
    base_unallocated = capital - capital_slice * len([s for s in per_symbol if s.get('success')])
    if base_unallocated < 0:
        base_unallocated = 0

    # align by date intersection
    date_set: Optional[set] = None
    for s in per_symbol:
        if not s.get('success'):
            continue
        ds = set(p['date'] for p in s['equity'])
        date_set = ds if date_set is None else (date_set & ds)
    common_dates = sorted(date_set) if date_set else []

    combined: List[Dict[str, Any]] = []
    if common_dates:
        # build per-symbol date→equity map
        maps = []
        for s in per_symbol:
            if not s.get('success'):
                continue
            maps.append({p['date']: p['value'] for p in s['equity']})
        for d in common_dates:
            total = base_unallocated + sum(m[d] for m in maps)
            combined.append({'date': d, 'equity': float(round(total, 2))})

    all_trades: List[Dict[str, Any]] = []
    for s in per_symbol:
        if s.get('success'):
            all_trades.extend(s.get('trades', []))
    all_trades.sort(key=lambda t: t.get('exit_date', ''))

    metrics = _aggregate_metrics(combined, all_trades, capital)

    # Equal-weight buy-and-hold of the basket over the same window — stored as
    # a TOTAL return % so _score_result annualizes it with the same `days` it
    # uses for the strategy, keeping the alpha term internally consistent.
    bh_vals = [s['buyhold_pct'] for s in per_symbol
               if s.get('success') and s.get('buyhold_pct') is not None]
    metrics['benchmark_total_pct'] = float(round(sum(bh_vals) / len(bh_vals), 3)) if bh_vals else 0.0

    # Build a CSV blob of every trade for client-side download
    csv_lines = ['symbol,entry_date,entry_price,exit_date,exit_price,pnl_pct,exit_reason']
    for t in all_trades:
        csv_lines.append(
            f"{t['symbol']},{t['entry_date']},{t['entry_price']},"
            f"{t['exit_date']},{t['exit_price']},{t['pnl_pct']},{t['exit_reason']}"
        )
    csv_blob = '\n'.join(csv_lines)

    return {
        'success': True,
        'plan': {
            'name': plan.get('name'),
            'symbols': symbols,
            'strategies': (plan.get('strategies') if isinstance(plan.get('strategies'), list)
                           else [plan.get('strategy', 'ma_cross')]),
            'combine_mode': plan.get('combine_mode', 'any'),
            'capital': capital,
            'pos_size_pct': pos_pct,
            'period': plan.get('period'),
            'take_profit_pct': plan.get('take_profit_pct'),
            'stop_loss_pct': plan.get('stop_loss_pct'),
        },
        'metrics': metrics,
        'equity_curve': combined,
        'trades': all_trades,            # full log
        'trade_count': len(all_trades),
        'trades_csv': csv_blob,          # client-side download
        'per_symbol': [{'symbol': s['symbol'], 'success': s.get('success'), 'final_equity': s.get('final_equity')} for s in per_symbol],
    }
