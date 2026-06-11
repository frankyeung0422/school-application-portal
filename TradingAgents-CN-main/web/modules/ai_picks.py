"""
AI-driven market scanning + ranking for autopilot paper trading.

Universes: subsets of S&P 500 / NASDAQ tech / Hang Seng. Each scan computes a
multi-factor score per symbol (RSI band, 5-day momentum, MA filter, volume),
classifies BUY / SELL / HOLD, and returns top-N. Results are cached for one
trading day per (universe, top_n) so the daily paper-trading scheduler can
share one scan across many accounts.
"""
from __future__ import annotations

import time
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

try:
    from modules.pro_backtest import _fetch
except Exception:
    from web.modules.pro_backtest import _fetch  # type: ignore


# Curated universes — kept smaller than full SP500 for tick speed
_LARGE_TECH_50 = [
    'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'GOOG', 'META', 'AMZN', 'TSLA', 'AVGO', 'AMD',
    'CRM', 'ORCL', 'ADBE', 'CSCO', 'INTC', 'QCOM', 'INTU', 'NOW', 'PANW', 'NFLX',
    'AMAT', 'KLAC', 'LRCX', 'MU', 'TXN', 'SNPS', 'CDNS', 'ANET', 'FTNT', 'CRWD',
    'PLTR', 'SHOP', 'SQ', 'PYPL', 'ZS', 'DDOG', 'SNOW', 'NET', 'MDB', 'TEAM',
    'ROKU', 'PINS', 'SNAP', 'UBER', 'LYFT', 'ABNB', 'COIN', 'HOOD', 'SOFI', 'RBLX',
]

_SP500_TOP50 = [
    'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'BRK.B', 'LLY', 'AVGO',
    'JPM', 'V', 'XOM', 'UNH', 'MA', 'PG', 'JNJ', 'COST', 'HD', 'ORCL',
    'BAC', 'NFLX', 'CVX', 'KO', 'CRM', 'AMD', 'WMT', 'PEP', 'TMO', 'ABBV',
    'CSCO', 'LIN', 'ACN', 'ADBE', 'MCD', 'WFC', 'DIS', 'ABT', 'INTU', 'IBM',
    'PFE', 'GE', 'PM', 'CAT', 'AXP', 'NOW', 'TXN', 'GS', 'BX', 'QCOM',
]

_HSI_TOP30 = [
    '0700.HK', '9988.HK', '1299.HK', '0388.HK', '0005.HK', '0939.HK', '0883.HK', '1398.HK',
    '0011.HK', '0016.HK', '0001.HK', '0002.HK', '0003.HK', '0006.HK', '0012.HK',
    '0066.HK', '0017.HK', '0027.HK', '0288.HK', '0386.HK', '0669.HK', '0857.HK',
    '0941.HK', '0960.HK', '0968.HK', '1810.HK', '2318.HK', '2388.HK', '2628.HK', '3690.HK',
]

# T15 — Crypto universe via Yahoo Finance's USD pairs. 24/7 OHLCV; uses the
# same _fetch path but the daily-bar replay loop is unaffected since the
# tick processes whatever bars yfinance returned for the date range. Default
# vol-target for crypto accounts should be 50%+ (vs 12% for equities).
_CRYPTO_TOP10 = [
    'BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD',
    'ADA-USD', 'AVAX-USD', 'DOGE-USD', 'LINK-USD', 'DOT-USD',
]

# E3 — CSI 300 most-liquid ~50 (yfinance-style .SS/.SZ suffixes; data path
# falls back to tushare/akshare via pro_backtest's CN delegation). A-share
# accounts get honest costs (2.5bp+stamp) and T+1 from paper_trading.
_CSI300_TOP50 = [
    '600519.SS', '601318.SS', '600036.SS', '601012.SS', '600900.SS',
    '601166.SS', '600276.SS', '600030.SS', '601398.SS', '601888.SS',
    '600887.SS', '601988.SS', '601628.SS', '600028.SS', '601857.SS',
    '600048.SS', '600309.SS', '600406.SS', '601601.SS', '601288.SS',
    '603259.SS', '603501.SS', '600585.SS', '601899.SS', '600031.SS',
    '300750.SZ', '000858.SZ', '000333.SZ', '002594.SZ', '000651.SZ',
    '002475.SZ', '300059.SZ', '002415.SZ', '000725.SZ', '002714.SZ',
    '300760.SZ', '002352.SZ', '000568.SZ', '002304.SZ', '300015.SZ',
    '000001.SZ', '000002.SZ', '002142.SZ', '300124.SZ', '002027.SZ',
    '300498.SZ', '000063.SZ', '002460.SZ', '300274.SZ', '002812.SZ',
]

UNIVERSES: Dict[str, Dict[str, Any]] = {
    'sp500_top50': {'label': '美股大盤 (S&P 500 Top 50)', 'symbols': _SP500_TOP50},
    'tech':        {'label': '科技股 (Mega Cap Tech)', 'symbols': _LARGE_TECH_50},
    'hsi':         {'label': '港股 (HSI Top 30)', 'symbols': _HSI_TOP30},
    'csi300_top50': {'label': 'A股 (滬深300 Top 50)', 'symbols': _CSI300_TOP50},
    'crypto':      {'label': '加密貨幣 (Top 10 USD pairs)', 'symbols': _CRYPTO_TOP10},
}


_CACHE: Dict[str, Tuple[float, Any]] = {}
_CACHE_TTL = 8 * 3600  # 8 hours — lets us share within a trading day


def _cached(key: str, fn):
    now = time.time()
    if key in _CACHE:
        ts, v = _CACHE[key]
        if now - ts < _CACHE_TTL:
            return v
    v = fn()
    _CACHE[key] = (now, v)
    return v


def _rsi(closes: List[float], n: int = 14) -> float:
    if len(closes) < n + 1:
        return 50.0
    gains = []
    losses = []
    for i in range(1, len(closes)):
        d = closes[i] - closes[i - 1]
        gains.append(max(d, 0))
        losses.append(-min(d, 0))
    avg_g = sum(gains[-n:]) / n
    avg_l = sum(losses[-n:]) / n
    if avg_l == 0:
        return 100.0
    rs = avg_g / avg_l
    return 100 - (100 / (1 + rs))


# Liquidity floor — disqualify illiquid names from the BUY list.
# Tunable via env so a power user can run aggressive scans on small caps.
import os as _os_lf
MIN_DOLLAR_VOLUME = float(_os_lf.environ.get('AI_PICKS_MIN_ADV_USD') or 5_000_000)  # $5M ADV
MIN_MARKET_CAP = float(_os_lf.environ.get('AI_PICKS_MIN_MCAP_USD') or 500_000_000)  # $500M


def _liquidity_ok(symbol: str, last_price: float) -> bool:
    """Reject names that are too thinly traded for a real fill at our size.

    Uses yfinance info.averageVolume * last_price as ADV proxy and
    info.marketCap. HK names are converted to USD-equivalent via a 7.8 peg
    estimate (good enough for floor checks).
    """
    try:
        import yfinance as yf
        info = yf.Ticker(symbol).info or {}
    except Exception:
        return True  # data unavailable — don't penalize
    avg_vol = info.get('averageVolume') or info.get('averageDailyVolume10Day') or 0
    mcap = info.get('marketCap') or 0
    # USD-equivalent quick conversion for HK names
    fx = 1.0 / 7.8 if symbol.upper().endswith('.HK') else 1.0
    adv_usd = float(avg_vol) * float(last_price) * fx
    mcap_usd = float(mcap) * fx
    if adv_usd > 0 and adv_usd < MIN_DOLLAR_VOLUME:
        return False
    if mcap_usd > 0 and mcap_usd < MIN_MARKET_CAP:
        return False
    return True


def _score_symbol(symbol: str) -> Optional[Dict[str, Any]]:
    """Compute multi-factor score for a single symbol. Returns None on data failure."""
    data = _fetch(symbol, '6mo')
    if not data:
        return None
    dates, closes, highs, lows = data
    if len(closes) < 30:
        return None

    cur = float(closes[-1])
    prev = float(closes[-2])
    if cur <= 0 or prev <= 0:
        return None

    # Liquidity floor — drop illiquid micro-caps before scoring
    if not _liquidity_ok(symbol, cur):
        return None

    rsi = _rsi(closes, 14)
    mom_5 = (cur / closes[-6] - 1) * 100 if len(closes) >= 6 else 0.0
    mom_20 = (cur / closes[-21] - 1) * 100 if len(closes) >= 21 else 0.0
    ma5 = sum(closes[-5:]) / 5 if len(closes) >= 5 else cur
    ma20 = sum(closes[-20:]) / 20 if len(closes) >= 20 else cur
    ma50 = sum(closes[-50:]) / 50 if len(closes) >= 50 else cur
    chg_pct = (cur - prev) / prev * 100

    # Multi-factor scoring — positive = BUY conviction, negative = SELL
    score = 0.0
    reasons: List[str] = []

    if rsi < 30:
        score += 3
        reasons.append(f'RSI 超賣 ({rsi:.0f})')
    elif rsi > 70:
        score -= 3
        reasons.append(f'RSI 超買 ({rsi:.0f})')
    elif 35 <= rsi <= 50:
        score += 1
        reasons.append(f'RSI 偏低 ({rsi:.0f})')

    if mom_5 > 4:
        score += 2
        reasons.append(f'5日動量 +{mom_5:.1f}%')
    elif mom_5 < -4:
        score -= 2
        reasons.append(f'5日動量 {mom_5:.1f}%')

    if mom_20 > 8:
        score += 2
        reasons.append(f'20日動量 +{mom_20:.1f}%')
    elif mom_20 < -8:
        score -= 2
        reasons.append(f'20日動量 {mom_20:.1f}%')

    if cur > ma5 and cur > ma20 and ma20 > ma50:
        score += 2
        reasons.append('多頭排列')
    elif cur < ma5 and cur < ma20 and ma20 < ma50:
        score -= 2
        reasons.append('空頭排列')

    # T10 — Smart-money conviction boost. Pull the most recently persisted
    # conviction_score for this symbol (within the last week) and add a
    # small bonus toward BUY for high-conviction names, penalty for the
    # opposite. Gracefully no-ops if conviction_engine is unimportable or
    # the table is empty (fresh installs).
    try:
        try:
            from .conviction_engine import get_cached_score  # type: ignore
        except ImportError:
            from web.modules.conviction_engine import get_cached_score  # type: ignore
        cached = get_cached_score(symbol, max_age_days=7)
        if cached:
            cs = float(cached['conviction_score'])
            # Linear map: 50 → 0 bonus, 100 → +2.5, 0 → -2.5.
            conviction_bonus = (cs - 50.0) / 20.0
            score += conviction_bonus
            if cs >= 70:
                reasons.append(f'智能資金高分 {cs:.0f}')
            elif cs <= 30:
                reasons.append(f'智能資金低分 {cs:.0f}')
    except Exception:
        # Best-effort — never let conviction-engine errors break ai_picks.
        pass

    if score >= 3:
        direction = 'BUY'
    elif score <= -3:
        direction = 'SELL'
    else:
        direction = 'HOLD'

    return {
        'symbol': symbol,
        'price': round(cur, 2),
        'change_pct': round(chg_pct, 2),
        'rsi': round(rsi, 1),
        'mom_5': round(mom_5, 2),
        'mom_20': round(mom_20, 2),
        'score': round(score, 1),
        'direction': direction,
        'reasons': reasons,
    }


def _resolve_universes(universe: str,
                       custom_symbols: Optional[List[str]] = None) -> Tuple[List[str], List[str], str]:
    """Accept either a single universe id or a comma-separated combo, plus an
    optional user-supplied custom symbol list. Returns (merged, ids, label)."""
    raw = (universe or 'sp500_top50').strip()
    ids = [u.strip().lower() for u in raw.split(',') if u.strip()]
    # Built-in universes
    builtins = [u for u in ids if u in UNIVERSES]
    has_custom = 'custom' in ids
    if not builtins and not has_custom:
        return [], [], ''
    merged: List[str] = []
    seen = set()
    labels = []
    for uid in builtins:
        labels.append(UNIVERSES[uid]['label'])
        for s in UNIVERSES[uid]['symbols']:
            if s not in seen:
                seen.add(s)
                merged.append(s)
    if has_custom and custom_symbols:
        cleaned = []
        for s in custom_symbols:
            sym = (s or '').strip().upper()
            if sym and sym not in seen:
                seen.add(sym)
                cleaned.append(sym)
                merged.append(sym)
        if cleaned:
            labels.append(f'自訂池 ({len(cleaned)} 檔)')
    final_ids = builtins + (['custom'] if has_custom and custom_symbols else [])
    return merged, final_ids, ' + '.join(labels) or '自訂池'


def scan_universe(universe: str = 'sp500_top50', top_n: int = 10,
                  custom_symbols: Optional[List[str]] = None) -> Dict[str, Any]:
    """Score every symbol in one or more universes (csv); return top picks.
    `custom_symbols` is required when universe contains 'custom'."""
    symbols, ids, label = _resolve_universes(universe, custom_symbols)
    if not symbols:
        return {'success': False, 'error': f'Unknown or empty universe: {universe}'}

    # Cache key includes a hash of custom_symbols since 'custom' is per-user content
    import hashlib
    canon_builtins = ','.join(sorted(u for u in ids if u != 'custom'))
    custom_hash = ''
    if 'custom' in ids and custom_symbols:
        custom_hash = ':' + hashlib.md5(
            ','.join(sorted(s.upper() for s in custom_symbols)).encode()
        ).hexdigest()[:10]
    cache_key = f'scan:{canon_builtins}{custom_hash}:{date.today().isoformat()}'

    def compute():
        results: List[Dict[str, Any]] = []
        for sym in symbols:
            try:
                r = _score_symbol(sym)
                if r:
                    results.append(r)
            except Exception:
                continue
        results.sort(key=lambda x: -x['score'])
        return results

    all_picks = _cached(cache_key, compute)
    top = all_picks[:max(1, min(top_n, len(all_picks)))]
    return {
        'success': True,
        'universe': ','.join(ids),
        'universe_ids': ids,
        'universe_label': label,
        'as_of': date.today().isoformat(),
        'count_scanned': len(symbols),
        'count_with_data': len(all_picks),
        'top': top,
        'all': all_picks,
    }


def _news_sentiment_filter(symbols: List[str], min_sentiment: float = -0.10,
                           min_articles: int = 3) -> List[str]:
    """
    Drop symbols with negative or missing news coverage. A pro trader wants
    visibility — sparse-coverage names (often illiquid micro-caps) should be
    dropped, not waved through. Use ``min_articles=0`` to opt back into the
    permissive old behavior.
    """
    try:
        from modules.pro_sentiment import analyze_sentiment
    except Exception:
        return symbols  # filter unavailable, pass through
    kept: List[str] = []
    for sym in symbols:
        try:
            res = analyze_sentiment(sym)
            if not res.get('success'):
                # If sentiment endpoint failed entirely, don't penalize the symbol —
                # this is an infra glitch, not a coverage signal.
                kept.append(sym)
                continue
            avg = res.get('avg_sentiment', 0) or 0
            n_articles = (res.get('article_count')
                          or len(res.get('articles') or [])
                          or 0)
            if min_articles and n_articles < min_articles:
                # Sparse coverage — drop. Pro traders want names with active
                # news flow so exits don't fail on stale tape.
                continue
            if avg >= min_sentiment:
                kept.append(sym)
        except Exception:
            kept.append(sym)
    return kept


# ---- LLM-driven news filter ----
import os as _os
_LLM_NEWS_CACHE: Dict[str, tuple] = {}
_LLM_NEWS_TTL = 6 * 3600  # 6h


def _news_sentiment_filter_llm(symbols: List[str]) -> List[str]:
    """
    Per-symbol news sentiment via LLM. Pulls headlines from pro_sentiment._fetch_news,
    asks LLM for a single verdict per symbol (positive / neutral / negative), drops
    negatives. Falls back to lexicon if no LLM key.
    """
    has_key = bool(
        _os.environ.get('ANTHROPIC_API_KEY')
        or _os.environ.get('OPENAI_API_KEY')
        or _os.environ.get('DASHSCOPE_API_KEY')
    )
    if not has_key:
        return _news_sentiment_filter(symbols)

    try:
        from modules.pro_sentiment import _fetch_news
        from modules.pro_ai import _try_llm
    except Exception:
        return _news_sentiment_filter(symbols)

    today = date.today().isoformat()
    kept: List[str] = []
    for sym in symbols:
        cache_key = f'llm:{sym}:{today}'
        cached = _LLM_NEWS_CACHE.get(cache_key)
        if cached and time.time() - cached[0] < _LLM_NEWS_TTL:
            verdict = cached[1]
        else:
            try:
                items = _fetch_news(sym) or []
            except Exception:
                items = []
            if not items:
                # No news to judge — keep the symbol (don't penalize sparse coverage)
                _LLM_NEWS_CACHE[cache_key] = (time.time(), 'neutral')
                kept.append(sym)
                continue
            titles = [it.get('title', '') for it in items[:8] if it.get('title')]
            if not titles:
                _LLM_NEWS_CACHE[cache_key] = (time.time(), 'neutral')
                kept.append(sym)
                continue
            prompt = (
                f'Symbol: {sym}\n\n'
                'Recent news headlines:\n'
                + '\n'.join(f'- {t}' for t in titles)
                + '\n\nClassify the OVERALL sentiment of these headlines toward this stock. '
                + 'Reply with EXACTLY ONE word: positive, neutral, or negative.'
            )
            try:
                resp = _try_llm(prompt, system='You are a financial sentiment classifier. Reply with exactly one word.') or ''
                verdict = resp.strip().lower().split()[0] if resp.strip() else 'neutral'
                if verdict not in ('positive', 'neutral', 'negative'):
                    # Try to fish out a known token
                    if 'negat' in verdict:
                        verdict = 'negative'
                    elif 'posit' in verdict:
                        verdict = 'positive'
                    else:
                        verdict = 'neutral'
            except Exception:
                verdict = 'neutral'
            _LLM_NEWS_CACHE[cache_key] = (time.time(), verdict)
        if verdict != 'negative':
            kept.append(sym)
    return kept


def top_long_symbols(universe: str = 'sp500_top50', top_n: int = 5,
                     custom_symbols: Optional[List[str]] = None,
                     news_filter: bool = False,
                     news_filter_mode: str = 'lexicon',
                     pick_source: str = 'heuristic') -> List[str]:
    """Return just the symbols with BUY signals, ranked. Used by paper-trading tick.
    news_filter_mode: 'lexicon' (fast, keyword-based) or 'llm' (per-symbol LLM call).

    pick_source (P1c): 'heuristic' = the multi-factor scan below (default);
    'ml_ranker' = the LightGBM learning-to-rank cross-section (ml_ranker
    module). The ranker path degrades gracefully — when there's no trained
    model or its scores are stale (>7 days), it returns [] and we fall
    through to the heuristic scan, so accounts never go pick-less because a
    weekly training job failed."""
    if (pick_source or 'heuristic').lower() == 'ml_ranker':
        try:
            try:
                from .ml_ranker import top_symbols as _ml_top
            except ImportError:
                from web.modules.ml_ranker import top_symbols as _ml_top  # type: ignore
            ml_picks = _ml_top(universe, top_n=top_n,
                               custom_symbols=custom_symbols)
        except Exception:
            ml_picks = []
        if ml_picks:
            if news_filter:
                if news_filter_mode == 'llm':
                    ml_picks = _news_sentiment_filter_llm(ml_picks)
                else:
                    ml_picks = _news_sentiment_filter(ml_picks)
            if ml_picks:
                return ml_picks[:top_n]
        # fall through to the heuristic scan

    multiplier = 5 if news_filter else 3
    res = scan_universe(universe, top_n=top_n * multiplier, custom_symbols=custom_symbols)
    if not res.get('success'):
        return []
    buys = [p['symbol'] for p in res.get('top', []) if p['direction'] == 'BUY']
    holds = [p['symbol'] for p in res.get('top', []) if p['direction'] == 'HOLD']
    candidates = buys + holds

    if news_filter:
        if news_filter_mode == 'llm':
            candidates = _news_sentiment_filter_llm(candidates)
        else:
            candidates = _news_sentiment_filter(candidates)

    if len([s for s in candidates if s in buys]) >= top_n:
        return [s for s in candidates if s in buys][:top_n]
    return candidates[:top_n]
