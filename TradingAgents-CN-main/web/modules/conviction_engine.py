"""
Smart-Money Conviction Engine — fuses news + 13F + technicals + insider activity
into a single per-symbol 0..100 score plus a recommended entry strategy.

Fusion formula:

    conviction = 100 * (
        w_n * news_factor          # 7-day news sentiment momentum (0..1)
      + w_f * flow_factor          # 13F superinvestor convergence (0..1)
      + w_t * technical_factor     # existing ai_picks score (normalized 0..1)
      + w_i * insider_factor       # net insider buy/sell from yfinance (0..1)
      - w_r * risk_penalty         # IV-spike / earnings-window / VIX gate (0..1)
    )

Weights are an initial guess; the persistence layer captures every score so
walk-forward calibration can re-fit them once we have ≥3 months of data.

The output for each picked symbol includes:
  - conviction_score (0..100)
  - per-factor breakdown
  - rationale string (humans can read why)
  - recommended_entry (outright / bull_put_spread / dca_3_legs / watch_only)

The engine reads from the persistent tables created by phases 1-3:
  - sentiment_history       (from news_aggregator)
  - institutional_holdings_13f + cusip_ticker_map (from sec_edgar_13f)
  - paper_symbol_meta       (sector, for diversification)

It writes back to conviction_scores so the dashboard can plot trajectories.
"""
from __future__ import annotations

import json
import logging
import sqlite3
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger('conviction_engine')

_DB = Path(__file__).resolve().parents[1] / 'trading_agents.db'

# ---------------------------------------------------------------------------
# Default fusion weights. Re-calibrate via walk-forward once we accumulate
# ≥3 months of conviction_scores history. Sum > 1 because we want the
# composite to occasionally exceed the 0..1 cap and saturate at 100 score.
# ---------------------------------------------------------------------------
_W_NEWS = 0.25
_W_FLOW = 0.40
_W_TECH = 0.20
_W_INSIDER = 0.15
_W_RISK = 0.30   # penalty multiplier


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(str(_DB), timeout=10.0)
    c.row_factory = sqlite3.Row
    return c


# ---------------------------------------------------------------------------
# Factor builders — each returns a 0..1 float plus a short rationale phrase.
# ---------------------------------------------------------------------------
def _news_factor(symbol: str) -> Dict[str, Any]:
    """7-day weighted news sentiment, mapped from [-1, +1] → [0, 1].
    Returns ``{value, reason}`` — reason is empty when no data is available."""
    try:
        from .news_aggregator import news_momentum, sentiment_trajectory  # type: ignore
    except ImportError:
        from web.modules.news_aggregator import news_momentum, sentiment_trajectory  # type: ignore
    value = news_momentum(symbol, days=7)
    traj = sentiment_trajectory(symbol, days=7, scorer='lexicon')
    if not traj:
        return {'value': value, 'reason': ''}
    last = traj[-1]
    themes = (last.get('themes') or [])[:3]
    n = sum(t['articles_n'] for t in traj)
    sign = '+' if value > 0.55 else ('-' if value < 0.45 else '~')
    theme_str = (', '.join(themes)) if themes else 'no themes'
    return {
        'value': value,
        'reason': f'{n} articles 7d, sentiment {sign}{abs((value - 0.5) * 2):.2f} [{theme_str}]',
    }


def _flow_factor(symbol: str) -> Dict[str, Any]:
    """Institutional 13F flow factor."""
    try:
        from .sec_edgar_13f import flow_factor, SUPERINVESTORS, compute_position_deltas  # type: ignore
    except ImportError:
        from web.modules.sec_edgar_13f import (  # type: ignore
            flow_factor, SUPERINVESTORS, compute_position_deltas,
        )
    value = flow_factor(symbol)
    # Build the rationale: which funds hold/added/dropped this name in latest qtr
    sym_up = symbol.upper()
    fund_actions: List[str] = []
    for s in SUPERINVESTORS:
        deltas = compute_position_deltas(s['cik'])
        for d in deltas:
            if d.get('symbol') == sym_up:
                lab = s['label'].split('(')[0].strip().split()[0]  # e.g. "Berkshire"
                if d['action'] == 'NEW':
                    fund_actions.append(f'{lab} NEW')
                elif d['action'] == 'INCREASE':
                    fund_actions.append(f'{lab} +{d["pct_delta"]:.0f}%')
                elif d['action'] == 'TRIM':
                    fund_actions.append(f'{lab} {d["pct_delta"]:.0f}%')
                elif d['action'] == 'EXITED':
                    fund_actions.append(f'{lab} EXIT')
                elif d['action'] == 'HOLD' and (d.get('pct_of_portfolio_now') or 0) > 2:
                    fund_actions.append(f'{lab} HOLD')
    reason = '; '.join(fund_actions[:6]) if fund_actions else 'no superinvestor activity'
    return {'value': value, 'reason': reason}


def _technical_factor(symbol: str) -> Dict[str, Any]:
    """Normalize existing ai_picks._score_symbol output (-9..+9 ish) to 0..1."""
    try:
        from .ai_picks import _score_symbol  # type: ignore
    except ImportError:
        from web.modules.ai_picks import _score_symbol  # type: ignore
    try:
        s = _score_symbol(symbol)
    except Exception as e:  # noqa: BLE001
        logger.debug(f'tech factor failed for {symbol}: {e}')
        return {'value': 0.5, 'reason': ''}
    if not s:
        return {'value': 0.5, 'reason': ''}
    raw = float(s.get('score', 0))
    value = max(0.0, min(1.0, 0.5 + raw / 18.0))  # ±9 → 0..1
    direction = s.get('direction', 'HOLD')
    reasons = (s.get('reasons') or [])[:3]
    reason = f'{direction} (score {raw:+.1f}): {"; ".join(reasons)}' if reasons else direction
    return {'value': value, 'reason': reason}


def _insider_factor(symbol: str) -> Dict[str, Any]:
    """Net insider buy/sell over recent transactions, mapped to 0..1.
    Reuses pro_insider.smart_money_dashboard.
    """
    try:
        from .pro_insider import smart_money_dashboard  # type: ignore
    except ImportError:
        try:
            from web.modules.pro_insider import smart_money_dashboard  # type: ignore
        except ImportError:
            return {'value': 0.5, 'reason': ''}
    try:
        d = smart_money_dashboard(symbol)
    except Exception:
        return {'value': 0.5, 'reason': ''}
    if not d or not d.get('success'):
        return {'value': 0.5, 'reason': ''}
    summary = d.get('summary', {}) or {}
    bias = summary.get('insider_bias', 'neutral')
    if bias == 'bullish':
        value = 0.75
        reason = f'insider net-buying {summary.get("net_value_usd", 0):+,.0f}'
    elif bias == 'bearish':
        value = 0.30
        reason = f'insider net-selling {summary.get("net_value_usd", 0):+,.0f}'
    else:
        value = 0.5
        reason = 'insider activity neutral'
    return {'value': value, 'reason': reason}


def _risk_penalty(symbol: str) -> Dict[str, Any]:
    """Risk modifiers: earnings within 5d, VIX > 30, illiquid. 0..1 — subtracted."""
    penalty = 0.0
    reasons: List[str] = []
    # Earnings calendar — best-effort import.
    try:
        try:
            from .pro_calendar import _fetch_calendar  # type: ignore
        except ImportError:
            from web.modules.pro_calendar import _fetch_calendar  # type: ignore
        cal = _fetch_calendar(symbol)
        if cal and cal.get('next_event_type') == 'earnings_date':
            d_to = cal.get('next_event_days')
            if d_to is not None and 0 <= d_to <= 5:
                penalty += 0.30
                reasons.append(f'earnings in {d_to}d')
    except Exception:
        pass
    # VIX panic check — penalize all entries when market is in stress.
    try:
        try:
            from .paper_trading import _vix_latest  # type: ignore
        except ImportError:
            from web.modules.paper_trading import _vix_latest  # type: ignore
        vix = _vix_latest()
        if vix is not None and vix > 30:
            penalty += 0.20
            reasons.append(f'VIX {vix:.0f}')
    except Exception:
        pass
    return {'value': min(1.0, penalty), 'reason': '; '.join(reasons) if reasons else 'no flags'}


# ---------------------------------------------------------------------------
# IV-rank lookup for entry recommendation
# ---------------------------------------------------------------------------
def _iv_rank(symbol: str) -> Optional[float]:
    """Realized-vol-based IV-rank proxy from the existing options recommender."""
    try:
        try:
            from .pro_backtest import _fetch  # type: ignore
        except ImportError:
            from web.modules.pro_backtest import _fetch  # type: ignore
        try:
            from .pro_options_recommender import _vol_rank  # type: ignore
        except ImportError:
            from web.modules.pro_options_recommender import _vol_rank  # type: ignore
        data = _fetch(symbol, '2y')
        if not data:
            return None
        _, closes, _, _ = data
        return _vol_rank(closes)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Recommended-entry decision
# ---------------------------------------------------------------------------
def _recommended_entry(symbol: str, conviction: float,
                       budget: Optional[float] = None,
                       risk_penalty_val: float = 0.0) -> Dict[str, Any]:
    """Pick the entry strategy that best fits this conviction + IV regime.

    Logic:
      - conviction ≥ 70 + IV rank < 40  → outright_buy (small slice of budget)
      - conviction ≥ 60 + IV rank ≥ 50  → bull_put_spread (collect premium)
      - conviction ≥ 50 + risk_penalty  → dca_3_legs (smooth entry)
      - else                            → watch_only
    """
    iv = _iv_rank(symbol)
    iv = float(iv) if iv is not None else 50.0
    slice_pct = 0.10 if conviction < 80 else 0.15   # 10–15% of budget per trade
    slice_usd = float(budget) * slice_pct if budget else None

    if conviction >= 70 and iv < 40:
        return {
            'kind': 'outright_buy',
            'reason': 'high conviction + low IV — buy stock outright',
            'sizing_pct_of_budget': slice_pct * 100,
            'suggested_allocation_usd': round(slice_usd, 2) if slice_usd else None,
            'iv_rank_pct': round(iv, 1),
        }
    if conviction >= 60 and iv >= 50:
        # Defer to small-capital recommender for the actual spread legs
        return {
            'kind': 'bull_put_spread',
            'reason': 'high conviction + rich IV — sell premium, get paid to wait',
            'sizing_pct_of_budget': slice_pct * 100,
            'suggested_allocation_usd': round(slice_usd, 2) if slice_usd else None,
            'iv_rank_pct': round(iv, 1),
            'see_api': f'/api/options/small-capital?budget={int(budget or 2000)}&dte=14',
        }
    if conviction >= 50 and risk_penalty_val > 0.10:
        return {
            'kind': 'dca_3_legs',
            'reason': 'moderate conviction + risk flag — split entry over 3 weeks',
            'sizing_pct_of_budget': slice_pct * 100,
            'suggested_allocation_usd': round(slice_usd / 3, 2) if slice_usd else None,
            'cadence_days': 7,
            'legs': 3,
            'iv_rank_pct': round(iv, 1),
        }
    if conviction >= 50:
        return {
            'kind': 'outright_buy_half',
            'reason': 'moderate conviction — half-size entry',
            'sizing_pct_of_budget': slice_pct * 100 / 2,
            'suggested_allocation_usd': round(slice_usd / 2, 2) if slice_usd else None,
            'iv_rank_pct': round(iv, 1),
        }
    return {
        'kind': 'watch_only',
        'reason': 'conviction below 50 — not actionable yet',
        'iv_rank_pct': round(iv, 1),
    }


# ---------------------------------------------------------------------------
# Per-symbol scoring
# ---------------------------------------------------------------------------
def score_symbol(symbol: str, budget: Optional[float] = None,
                 run_bear_case: bool = True,
                 bear_case_threshold: float = 60.0) -> Dict[str, Any]:
    """Compute the conviction score for one symbol.

    T15: when ``run_bear_case`` is True AND preliminary conviction ≥
    ``bear_case_threshold``, run the LLM challenger to surface specific
    risks. The challenger's severity feeds back into ``risk_penalty``
    and can flip the recommended_entry to ``watch_only`` when verdict
    is 'block'. Cached per (symbol, day) so re-ranks are free.
    """
    nf = _news_factor(symbol)
    ff = _flow_factor(symbol)
    tf = _technical_factor(symbol)
    inf = _insider_factor(symbol)
    rp = _risk_penalty(symbol)

    # T15 — pick up walk-forward-calibrated weights if available; otherwise
    # fall back to the module defaults.
    try:
        try:
            from .conviction_calibration import current_weights  # type: ignore
        except ImportError:
            from web.modules.conviction_calibration import current_weights  # type: ignore
        w = current_weights()
    except Exception:
        w = {'news': _W_NEWS, 'flow': _W_FLOW, 'technical': _W_TECH,
             'insider': _W_INSIDER, 'risk': _W_RISK}

    # P2 — factor-momentum overlay: tilt each calibrated weight by the
    # factor's trailing 12-1 predictive performance (bounded ±30%; neutral
    # 1.0 multipliers when data is thin or the weekly job is stale).
    try:
        try:
            from .factor_momentum import current_multipliers  # type: ignore
        except ImportError:
            from web.modules.factor_momentum import current_multipliers  # type: ignore
        _fm = current_multipliers()
        w = {k: v * _fm.get(k, 1.0) for k, v in w.items()}
    except Exception:
        pass

    # T17A — when a trained ML model is available, use its prediction as
    # the preliminary score. Falls back to the linear weighted sum when
    # no model exists or prediction fails.
    ml_score: Optional[float] = None
    try:
        try:
            from .conviction_ml import predict_score  # type: ignore
        except ImportError:
            from web.modules.conviction_ml import predict_score  # type: ignore
        factor_dict = {
            'news_factor': nf['value'], 'flow_factor': ff['value'],
            'technical_factor': tf['value'], 'insider_factor': inf['value'],
            'risk_penalty': rp['value'],
        }
        ml_score = predict_score(factor_dict)
    except Exception:
        ml_score = None

    if ml_score is not None:
        prelim = ml_score
        score_source = 'ml_gbm'
    else:
        composite = (
            w['news'] * nf['value']
            + w['flow'] * ff['value']
            + w['technical'] * tf['value']
            + w['insider'] * inf['value']
            - w['risk'] * rp['value']
        )
        prelim = max(0.0, min(100.0, composite * 100))
        score_source = 'linear'

    rationale: Dict[str, Any] = {
        'news':      {'value': round(nf['value'], 3),  'reason': nf['reason']},
        'flow':      {'value': round(ff['value'], 3),  'reason': ff['reason']},
        'technical': {'value': round(tf['value'], 3),  'reason': tf['reason']},
        'insider':   {'value': round(inf['value'], 3), 'reason': inf['reason']},
        'risk':      {'value': round(rp['value'], 3),  'reason': rp['reason']},
    }

    # Bear-case challenger — only spend the LLM call on plausibly-actionable
    # candidates (preliminary score above threshold). Below that, BC won't
    # change the verdict (watch_only either way) so no point.
    bc_verdict = 'pass'
    if run_bear_case and prelim >= bear_case_threshold:
        try:
            try:
                from .bear_case import apply_to_rationale  # type: ignore
            except ImportError:
                from web.modules.bear_case import apply_to_rationale  # type: ignore
            bc_result = apply_to_rationale(symbol, prelim, rationale)
            bc_verdict = bc_result.get('verdict', 'pass')
        except Exception as e:  # noqa: BLE001
            logger.debug(f'bear_case failed for {symbol}: {e}')

    # Recompute composite using the (possibly updated) risk factor.
    final_risk_val = float((rationale.get('risk') or {}).get('value') or rp['value'])
    if ml_score is not None:
        # Re-query ML model with the post-bear-case risk; same factor inputs.
        try:
            factor_dict_v2 = dict(factor_dict)
            factor_dict_v2['risk_penalty'] = final_risk_val
            ml_v2 = predict_score(factor_dict_v2)
            conviction = ml_v2 if ml_v2 is not None else prelim
        except Exception:
            conviction = prelim
    else:
        composite_final = (
            w['news'] * nf['value']
            + w['flow'] * ff['value']
            + w['technical'] * tf['value']
            + w['insider'] * inf['value']
            - w['risk'] * final_risk_val
        )
        conviction = max(0.0, min(100.0, composite_final * 100))

    rec_entry = _recommended_entry(symbol, conviction, budget=budget,
                                   risk_penalty_val=final_risk_val)
    # Bear-case 'block' verdict overrides whatever the entry recommendation
    # would have been — even a 90 conviction stops being actionable when
    # the short-seller LLM found a concrete reason to avoid it.
    if bc_verdict == 'block':
        rec_entry = {
            'kind': 'watch_only',
            'reason': 'bear-case challenger blocked entry — see rationale.bear_case',
            'iv_rank_pct': rec_entry.get('iv_rank_pct', None),
        }

    return {
        'symbol': symbol.upper(),
        'conviction_score': round(conviction, 1),
        'preliminary_score': round(prelim, 1),
        'bear_case_verdict': bc_verdict,
        'score_source': score_source,
        'rationale': rationale,
        'recommended_entry': rec_entry,
        'weights': w,
    }


# ---------------------------------------------------------------------------
# Persistence + retrieval
# ---------------------------------------------------------------------------
def persist_score(result: Dict[str, Any], score_date: Optional[str] = None) -> None:
    """Insert/replace into conviction_scores. Also fires a
    ``conviction_cross_up`` alert when today's score crosses below→above 70
    relative to the most recent prior row."""
    d = score_date or date.today().isoformat()
    rat = result.get('rationale', {}) or {}
    sym = result['symbol']
    new_score = float(result['conviction_score'])

    with _conn() as c:
        # Look up the previous score for cross detection BEFORE the upsert.
        prev_row = c.execute(
            '''SELECT conviction_score FROM conviction_scores
               WHERE symbol=? AND score_date < ?
               ORDER BY score_date DESC LIMIT 1''',
            (sym, d)).fetchone()
        prev_score = float(prev_row['conviction_score']) if prev_row else None

        c.execute(
            '''INSERT OR REPLACE INTO conviction_scores
               (symbol, score_date, conviction_score,
                news_factor, flow_factor, technical_factor, insider_factor,
                risk_penalty, rationale_json, recommended_entry_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (sym, d, new_score,
             rat.get('news', {}).get('value'),
             rat.get('flow', {}).get('value'),
             rat.get('technical', {}).get('value'),
             rat.get('insider', {}).get('value'),
             rat.get('risk', {}).get('value'),
             json.dumps(rat), json.dumps(result.get('recommended_entry', {}))),
        )
        c.commit()

    # T11 alert hook — fire conviction_cross_up when score crossed
    # below→above 70. Best-effort; never let alert failures break the
    # ingest path.
    if prev_score is not None and prev_score < 70.0 and new_score >= 70.0:
        try:
            try:
                from .alerts import fan_out  # type: ignore
            except ImportError:
                from web.modules.alerts import fan_out  # type: ignore
            fan_out(
                kind='conviction_cross_up',
                key=f'{sym}|conviction_cross_up|{d}',
                payload={
                    'symbol': sym,
                    'conviction_score': round(new_score, 1),
                    'previous_score': round(prev_score, 1),
                    'rationale': rat,
                    'recommended_entry': result.get('recommended_entry', {}),
                },
            )
        except Exception as e:  # noqa: BLE001
            logger.warning(f'conviction_cross_up alert failed for {sym}: {e}')


def get_cached_score(symbol: str, max_age_days: int = 7) -> Optional[Dict[str, Any]]:
    """Return the most recent conviction row for symbol, if any within max_age_days.
    Used by ai_picks for the cross-pollination factor."""
    cutoff = (date.today() - timedelta(days=max_age_days)).isoformat()
    with _conn() as c:
        row = c.execute(
            '''SELECT symbol, score_date, conviction_score, news_factor,
                      flow_factor, technical_factor, insider_factor, risk_penalty,
                      rationale_json, recommended_entry_json
               FROM conviction_scores
               WHERE symbol=? AND score_date >= ?
               ORDER BY score_date DESC LIMIT 1''',
            (symbol.upper(), cutoff)).fetchone()
    if not row:
        return None
    return {
        'symbol': row['symbol'],
        'score_date': row['score_date'],
        'conviction_score': row['conviction_score'],
        'news_factor': row['news_factor'],
        'flow_factor': row['flow_factor'],
        'technical_factor': row['technical_factor'],
        'insider_factor': row['insider_factor'],
        'risk_penalty': row['risk_penalty'],
        'rationale': json.loads(row['rationale_json'] or '{}'),
        'recommended_entry': json.loads(row['recommended_entry_json'] or '{}'),
    }


def trajectory(symbol: str, days: int = 30) -> List[Dict[str, Any]]:
    """Return the daily conviction series for the dashboard."""
    since = (date.today() - timedelta(days=days)).isoformat()
    with _conn() as c:
        rows = c.execute(
            '''SELECT score_date, conviction_score, news_factor, flow_factor,
                      technical_factor, insider_factor, risk_penalty
               FROM conviction_scores WHERE symbol=? AND score_date >= ?
               ORDER BY score_date ASC''',
            (symbol.upper(), since)).fetchall()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Universe ranking — the entrypoint scheduler/API call
# ---------------------------------------------------------------------------
def rank_universe(symbols: List[str],
                  budget: Optional[float] = None,
                  persist: bool = True) -> List[Dict[str, Any]]:
    """Score every symbol in `symbols`, persist, and return ranked list."""
    out: List[Dict[str, Any]] = []
    for sym in symbols:
        try:
            r = score_symbol(sym, budget=budget)
        except Exception as e:  # noqa: BLE001
            logger.warning(f'score failed for {sym}: {e}')
            continue
        if persist:
            try:
                persist_score(r)
            except Exception as e:  # noqa: BLE001
                logger.warning(f'persist failed for {sym}: {e}')
        out.append(r)
    out.sort(key=lambda x: -x['conviction_score'])
    return out


def top_picks(count: int = 20, min_score: float = 50.0,
              max_age_days: int = 3) -> List[Dict[str, Any]]:
    """Read the most-recently persisted scores (within `max_age_days`) and
    return the top `count` above `min_score`. Used by the dashboard."""
    cutoff = (date.today() - timedelta(days=max_age_days)).isoformat()
    with _conn() as c:
        rows = c.execute(
            '''SELECT cs.* FROM conviction_scores cs
               JOIN (SELECT symbol, MAX(score_date) AS d
                     FROM conviction_scores
                     WHERE score_date >= ? GROUP BY symbol) latest
                 ON latest.symbol = cs.symbol AND latest.d = cs.score_date
               WHERE cs.conviction_score >= ?
               ORDER BY cs.conviction_score DESC LIMIT ?''',
            (cutoff, min_score, count)).fetchall()
    out: List[Dict[str, Any]] = []
    for r in rows:
        out.append({
            'symbol': r['symbol'],
            'score_date': r['score_date'],
            'conviction_score': r['conviction_score'],
            'news_factor': r['news_factor'],
            'flow_factor': r['flow_factor'],
            'technical_factor': r['technical_factor'],
            'insider_factor': r['insider_factor'],
            'risk_penalty': r['risk_penalty'],
            'rationale': json.loads(r['rationale_json'] or '{}'),
            'recommended_entry': json.loads(r['recommended_entry_json'] or '{}'),
        })
    return out
