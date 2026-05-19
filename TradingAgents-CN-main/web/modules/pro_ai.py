"""
Pro AI Features — advanced AI-powered trading intelligence.

Modules:
- ai_chat: Conversational stock Q&A (LLM if available, template fallback)
- ai_patterns: Algorithmic chart pattern detection (H&S, double top, triangles, flags)
- ai_anomaly: Statistical anomaly detection on volume / vol / price
- ai_rebalancer: Modern Portfolio Theory + AI score rebalancing
- ai_trade_ideas: Daily AI-curated trade ideas
- ai_sector_rotation: Sector momentum & rotation tracker
- ai_risk_score: Composite 0-100 risk score
- ai_smart_alerts: Multi-condition intelligent alerts
- ai_compare: Side-by-side AI stock comparison
"""
from __future__ import annotations

import math
import os
import statistics
import time
from typing import Any, Dict, List, Optional, Tuple

_CACHE: Dict[str, tuple] = {}
_CACHE_TTL = 300


def _cached(key, fn, ttl=_CACHE_TTL):
    now = time.time()
    if key in _CACHE:
        ts, v = _CACHE[key]
        if now - ts < ttl:
            return v
    v = fn()
    _CACHE[key] = (now, v)
    return v


def _fetch_history(symbol: str, period: str = "1y"):
    try:
        import yfinance as yf
        h = yf.Ticker(symbol).history(period=period, interval="1d")
        if h is None or h.empty:
            return None
        return {
            "dates": [d.strftime("%Y-%m-%d") for d in h.index],
            "open": list(h["Open"].values),
            "high": list(h["High"].values),
            "low": list(h["Low"].values),
            "close": list(h["Close"].values),
            "volume": list(h["Volume"].values),
        }
    except Exception:
        return None


def _fetch_info(symbol: str):
    try:
        import yfinance as yf
        return yf.Ticker(symbol).info or {}
    except Exception:
        return {}


# ============================================================================
# 1. AI CHAT — conversational stock Q&A
# ============================================================================

def _try_llm(prompt: str, system: str = "") -> Optional[str]:
    """Call LLM if API key available, else None.

    Reads API keys through ``modules.config.get`` (T7.5) so template
    placeholder values like 'your-key-here' are treated as missing and
    logged — previously they'd be passed straight through to the SDK
    and produce confusing 401s.
    """
    try:
        from .config import get as _cfg
    except Exception:
        try:
            from web.modules.config import get as _cfg  # type: ignore
        except Exception:
            _cfg = lambda k, **kw: os.environ.get(k)  # type: ignore
    anth = _cfg('ANTHROPIC_API_KEY')
    openai_key = _cfg('OPENAI_API_KEY')
    dash = _cfg('DASHSCOPE_API_KEY')
    api_key = anth or openai_key or dash
    if not api_key:
        return None

    # Try Anthropic
    if anth:
        try:
            import anthropic
            client = anthropic.Anthropic()
            resp = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=600,
                system=system or "You are a helpful financial analyst.",
                messages=[{"role": "user", "content": prompt}],
            )
            return resp.content[0].text
        except Exception:
            pass

    # Try OpenAI
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI()
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system or "You are a helpful financial analyst."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=600,
            )
            return resp.choices[0].message.content
        except Exception:
            pass

    return None


def ai_chat(question: str, symbol: Optional[str] = None) -> Dict[str, Any]:
    """Answer a question about a stock or general market."""
    context_parts = []
    if symbol:
        info = _cached(f"info::{symbol}", lambda: _fetch_info(symbol), ttl=600)
        hist = _cached(f"hist::{symbol}", lambda: _fetch_history(symbol, "3mo"))
        if info:
            ctx = []
            ctx.append(f"Symbol: {symbol}")
            ctx.append(f"Name: {info.get('shortName') or info.get('longName') or symbol}")
            ctx.append(f"Sector: {info.get('sector', 'N/A')}")
            ctx.append(f"Industry: {info.get('industry', 'N/A')}")
            ctx.append(f"Market Cap: ${info.get('marketCap', 0):,}")
            if info.get('trailingPE'):
                ctx.append(f"P/E (TTM): {info['trailingPE']:.2f}")
            if info.get('priceToBook'):
                ctx.append(f"P/B: {info['priceToBook']:.2f}")
            if info.get('returnOnEquity'):
                ctx.append(f"ROE: {info['returnOnEquity']*100:.1f}%")
            if info.get('dividendYield'):
                dy = info['dividendYield']
                if 0 < dy < 0.15:
                    dy *= 100
                ctx.append(f"Dividend Yield: {dy:.2f}%")
            if hist:
                last = hist['close'][-1]
                if len(hist['close']) > 20:
                    pct_1m = (last / hist['close'][-21] - 1) * 100
                    ctx.append(f"Last Price: ${last:.2f} (1M change: {pct_1m:+.1f}%)")
            context_parts.append("\n".join(ctx))

    context = "\n\n".join(context_parts) if context_parts else ""
    prompt = f"""You are a professional financial analyst. Answer the user's question concisely (under 200 words). If you mention specific recommendations, always note "not financial advice".

{('Context:' + chr(10) + context + chr(10) + chr(10)) if context else ''}Question: {question}"""

    answer = _try_llm(prompt, "You are a sharp, concise financial analyst.")
    if answer:
        return {"success": True, "answer": answer, "model": "llm", "context_provided": bool(context)}

    # Template fallback (no LLM available)
    fallback = _template_answer(question, symbol, context_parts)
    return {"success": True, "answer": fallback, "model": "template", "context_provided": bool(context)}


def _template_answer(question: str, symbol: Optional[str], context_parts: List[str]) -> str:
    """Smart template fallback when no LLM key is configured."""
    q = question.lower()
    parts = []
    if symbol:
        parts.append(f"📊 關於 {symbol.upper()} 的分析:")
        if context_parts:
            parts.append(context_parts[0])
        parts.append("")

    keywords = {
        "buy": "建議買入前請結合多項指標：技術趨勢、基本面估值、市場情緒。可使用 Pro Suite 的 AI 信號模組獲取量化評分。",
        "sell": "賣出決策應參考：止損位、目標達成、基本面變化、組合再平衡需求。建議查看組合風險分析。",
        "hold": "持有策略適合中長期投資者，需定期檢視基本面變化和估值水平。",
        "target": "目標價可基於：分析師共識、技術阻力位、估值倍數（PE/PB）、相對強度。建議查看技術分析模組。",
        "risk": "風險評估應涵蓋：波動率、Beta、最大回撤、行業集中度。組合風險模組可提供完整指標。",
        "earnings": "查看財報需關注：EPS 是否超預期、營收增長率、毛利率、未來指引。可查看事件日曆獲取財報日期。",
        "dividend": "派息分析應關注：股息率、派息率、增長持續性、自由現金流覆蓋。",
        "outlook": "未來展望需綜合：宏觀環境、行業趨勢、公司執行力、估值。建議查看新聞情緒模組。",
    }

    matched = [v for k, v in keywords.items() if k in q]
    if matched:
        parts.extend(matched[:3])
    else:
        parts.append("這是一個專業問題，建議結合 Pro Suite 各模組綜合分析：技術 + 基本面 + 情緒 + 風險。")

    parts.append("")
    parts.append("⚠️ 以上僅供參考，非投資建議。提示：配置 ANTHROPIC_API_KEY 環境變數可啟用真正的 LLM 智能對話。")
    return "\n\n".join(parts)


# ============================================================================
# 2. AI CHART PATTERN RECOGNITION
# ============================================================================

def _find_peaks(values: List[float], min_distance: int = 5) -> List[int]:
    peaks = []
    for i in range(min_distance, len(values) - min_distance):
        window = values[i - min_distance:i + min_distance + 1]
        if values[i] == max(window) and values[i] > values[i - 1] and values[i] > values[i + 1]:
            peaks.append(i)
    return peaks


def _find_troughs(values: List[float], min_distance: int = 5) -> List[int]:
    troughs = []
    for i in range(min_distance, len(values) - min_distance):
        window = values[i - min_distance:i + min_distance + 1]
        if values[i] == min(window) and values[i] < values[i - 1] and values[i] < values[i + 1]:
            troughs.append(i)
    return troughs


def _linear_fit(xs, ys):
    n = len(xs)
    if n < 2:
        return 0, 0
    mx = sum(xs) / n
    my = sum(ys) / n
    num = sum((xs[i] - mx) * (ys[i] - my) for i in range(n))
    den = sum((xs[i] - mx) ** 2 for i in range(n))
    if den == 0:
        return 0, my
    slope = num / den
    intercept = my - slope * mx
    return slope, intercept


def detect_patterns(symbol: str) -> Dict[str, Any]:
    """Detect classical chart patterns."""
    hist = _cached(f"hist::{symbol}", lambda: _fetch_history(symbol, "1y"))
    if not hist or len(hist['close']) < 60:
        return {"success": False, "error": "Insufficient history"}

    closes = hist['close']
    highs = hist['high']
    lows = hist['low']
    n = len(closes)
    peaks = _find_peaks(highs, 5)
    troughs = _find_troughs(lows, 5)

    patterns = []

    # ---- Head & Shoulders (last 3 peaks) ----
    if len(peaks) >= 3:
        last3 = peaks[-3:]
        h1, h2, h3 = highs[last3[0]], highs[last3[1]], highs[last3[2]]
        if h2 > h1 and h2 > h3 and abs(h1 - h3) / h2 < 0.05:
            patterns.append({
                "name": "Head & Shoulders 頭肩頂",
                "type": "bearish_reversal",
                "confidence": 75,
                "detected_at": hist['dates'][last3[1]],
                "description": "三個高點：左肩 < 頭部 > 右肩 (左右肩近似對稱) — 看跌反轉信號",
                "neckline": round(min(lows[last3[0]:last3[2]]), 2),
            })

    # Inverse Head & Shoulders (last 3 troughs)
    if len(troughs) >= 3:
        last3 = troughs[-3:]
        l1, l2, l3 = lows[last3[0]], lows[last3[1]], lows[last3[2]]
        if l2 < l1 and l2 < l3 and abs(l1 - l3) / l2 < 0.05:
            patterns.append({
                "name": "Inverse H&S 倒頭肩",
                "type": "bullish_reversal",
                "confidence": 75,
                "detected_at": hist['dates'][last3[1]],
                "description": "三個低點：左肩 > 頭 < 右肩 — 看漲反轉信號",
                "neckline": round(max(highs[last3[0]:last3[2]]), 2),
            })

    # ---- Double Top / Bottom ----
    if len(peaks) >= 2:
        p1, p2 = peaks[-2], peaks[-1]
        if p2 - p1 > 10 and abs(highs[p1] - highs[p2]) / highs[p1] < 0.03:
            patterns.append({
                "name": "Double Top 雙頂",
                "type": "bearish_reversal",
                "confidence": 70,
                "detected_at": hist['dates'][p2],
                "description": f"在 ${highs[p1]:.2f} 附近兩次測試失敗 — 看跌反轉",
                "resistance": round(max(highs[p1], highs[p2]), 2),
            })
    if len(troughs) >= 2:
        t1, t2 = troughs[-2], troughs[-1]
        if t2 - t1 > 10 and abs(lows[t1] - lows[t2]) / lows[t1] < 0.03:
            patterns.append({
                "name": "Double Bottom 雙底",
                "type": "bullish_reversal",
                "confidence": 70,
                "detected_at": hist['dates'][t2],
                "description": f"在 ${lows[t1]:.2f} 附近兩次測試成功 — 看漲反轉",
                "support": round(min(lows[t1], lows[t2]), 2),
            })

    # ---- Triangles (last 60 days, peaks + troughs trend) ----
    recent_peaks = [p for p in peaks if p > n - 60]
    recent_troughs = [t for t in troughs if t > n - 60]
    if len(recent_peaks) >= 3 and len(recent_troughs) >= 3:
        peak_xs = recent_peaks
        peak_ys = [highs[i] for i in recent_peaks]
        trough_xs = recent_troughs
        trough_ys = [lows[i] for i in recent_troughs]
        ps, _ = _linear_fit(peak_xs, peak_ys)
        ts, _ = _linear_fit(trough_xs, trough_ys)
        avg_high = sum(peak_ys) / len(peak_ys)
        peak_pct = abs(ps) * len(peak_xs) / avg_high
        trough_pct = abs(ts) * len(trough_xs) / avg_high

        if ps < 0 and ts > 0 and peak_pct > 0.02 and trough_pct > 0.02:
            patterns.append({
                "name": "Symmetrical Triangle 對稱三角形",
                "type": "neutral_continuation",
                "confidence": 65,
                "detected_at": hist['dates'][-1],
                "description": "高點下傾 + 低點上升 — 等待方向突破",
            })
        elif ps < 0 and abs(ts) < 0.001 * avg_high:
            patterns.append({
                "name": "Descending Triangle 下降三角形",
                "type": "bearish_continuation",
                "confidence": 70,
                "detected_at": hist['dates'][-1],
                "description": "高點下傾 + 平坦支撐 — 通常向下突破",
            })
        elif ts > 0 and abs(ps) < 0.001 * avg_high:
            patterns.append({
                "name": "Ascending Triangle 上升三角形",
                "type": "bullish_continuation",
                "confidence": 70,
                "detected_at": hist['dates'][-1],
                "description": "低點上升 + 平坦阻力 — 通常向上突破",
            })

    # ---- Flag / Pennant (sharp move + consolidation) ----
    if n >= 30:
        sharp_move_pct = abs(closes[-30] / closes[-50] - 1) * 100 if n >= 50 else 0
        consol_range = (max(highs[-15:]) - min(lows[-15:])) / closes[-1] * 100
        if sharp_move_pct > 15 and consol_range < 8:
            direction = "bullish" if closes[-30] > closes[-50] else "bearish"
            patterns.append({
                "name": f"{'Bull' if direction == 'bullish' else 'Bear'} Flag {('牛旗' if direction == 'bullish' else '熊旗')}",
                "type": f"{direction}_continuation",
                "confidence": 60,
                "detected_at": hist['dates'][-1],
                "description": f"急速{'上漲' if direction == 'bullish' else '下跌'} {sharp_move_pct:.1f}% 後窄幅整理 — 通常延續原趨勢",
            })

    # ---- Cup & Handle ----
    if n >= 90:
        # Look for U-shape over last 60 days + small pullback
        bottom_idx = lows.index(min(lows[-90:-15]), n - 90, n - 15)
        left_high = max(highs[max(0, bottom_idx - 30):bottom_idx])
        right_high = max(highs[bottom_idx:n - 15])
        if left_high > 0 and abs(left_high - right_high) / left_high < 0.05:
            handle_low = min(lows[-15:])
            if handle_low > closes[bottom_idx] * 1.05:
                patterns.append({
                    "name": "Cup & Handle 杯柄",
                    "type": "bullish_continuation",
                    "confidence": 65,
                    "detected_at": hist['dates'][-1],
                    "description": "U 型底部 + 小幅回調手柄 — 經典看漲突破型態",
                    "breakout_level": round(max(left_high, right_high), 2),
                })

    return {
        "success": True,
        "symbol": symbol.upper(),
        "current_price": round(closes[-1], 2),
        "patterns_found": len(patterns),
        "patterns": patterns,
        "support_levels": [round(lows[t], 2) for t in troughs[-3:]] if troughs else [],
        "resistance_levels": [round(highs[p], 2) for p in peaks[-3:]] if peaks else [],
    }


# ============================================================================
# 3. AI ANOMALY DETECTION
# ============================================================================

def detect_anomalies(symbol: str, lookback: int = 60) -> Dict[str, Any]:
    hist = _cached(f"hist::{symbol}", lambda: _fetch_history(symbol, "6mo"))
    if not hist or len(hist['close']) < lookback:
        return {"success": False, "error": "Insufficient history"}

    # Cast numpy → native Python ints/floats so statistics.* and json.dumps work
    closes = [float(x) for x in hist['close'][-lookback:]]
    volumes = [float(x) for x in hist['volume'][-lookback:]]
    highs = [float(x) for x in hist['high'][-lookback:]]
    lows = [float(x) for x in hist['low'][-lookback:]]
    dates = list(hist['dates'][-lookback:])

    rets = [(closes[i] / closes[i - 1] - 1) for i in range(1, len(closes)) if closes[i - 1] > 0]
    ret_mean = sum(rets) / len(rets) if rets else 0
    ret_std = statistics.stdev(rets) if len(rets) > 1 else 0

    vol_mean = sum(volumes) / len(volumes) if volumes else 0
    vol_std = statistics.stdev(volumes) if len(volumes) > 1 else 0

    daily_ranges = [(highs[i] - lows[i]) / closes[i] for i in range(len(closes)) if closes[i] > 0]
    range_mean = sum(daily_ranges) / len(daily_ranges) if daily_ranges else 0
    range_std = statistics.stdev(daily_ranges) if len(daily_ranges) > 1 else 0

    anomalies = []
    # Last 20 days
    for i in range(max(1, len(closes) - 20), len(closes)):
        events = []
        # Price spike
        ret = (closes[i] / closes[i - 1] - 1) if closes[i - 1] > 0 else 0
        if ret_std > 0:
            z = (ret - ret_mean) / ret_std
            if abs(z) > 2.5:
                events.append({
                    "type": "price_spike",
                    "severity": "high" if abs(z) > 3.5 else "medium",
                    "z_score": round(z, 2),
                    "msg": f"價格異動 {ret * 100:+.2f}% (Z={z:.2f}σ)",
                })
        # Volume spike
        if vol_std > 0:
            zv = (volumes[i] - vol_mean) / vol_std
            if zv > 2.5:
                events.append({
                    "type": "volume_spike",
                    "severity": "high" if zv > 4 else "medium",
                    "z_score": round(zv, 2),
                    "msg": f"成交量爆量 {volumes[i] / vol_mean:.1f}x 平均 (Z={zv:.2f}σ)",
                })
        # Range expansion
        if range_std > 0:
            r = (highs[i] - lows[i]) / closes[i]
            zr = (r - range_mean) / range_std
            if zr > 2.5:
                events.append({
                    "type": "volatility_spike",
                    "severity": "medium",
                    "z_score": round(zr, 2),
                    "msg": f"日內波動擴大 {r * 100:.2f}% (Z={zr:.2f}σ)",
                })
        # Gap
        if i > 0:
            gap = (lows[i] - highs[i - 1]) / closes[i - 1] if closes[i - 1] > 0 else 0
            if gap > 0.03:
                events.append({"type": "gap_up", "severity": "high", "msg": f"向上跳空 {gap * 100:.2f}%"})
            gap_dn = (highs[i] - lows[i - 1]) / closes[i - 1] if closes[i - 1] > 0 else 0
            if gap_dn < -0.03:
                events.append({"type": "gap_down", "severity": "high", "msg": f"向下跳空 {gap_dn * 100:.2f}%"})

        for e in events:
            anomalies.append({"date": dates[i], "price": round(closes[i], 2), **e})

    anomalies.sort(key=lambda x: x['date'], reverse=True)
    return {
        "success": True,
        "symbol": symbol.upper(),
        "lookback_days": lookback,
        "anomaly_count": len(anomalies),
        "anomalies": anomalies[:30],
        "baseline": {
            "avg_daily_return_pct": round(ret_mean * 100, 3),
            "return_std_pct": round(ret_std * 100, 3),
            "avg_volume": int(vol_mean),
            "avg_daily_range_pct": round(range_mean * 100, 2),
        },
    }


# ============================================================================
# 4. AI PORTFOLIO REBALANCER
# ============================================================================

def rebalance_portfolio(positions: List[Dict[str, Any]], goal: str = "balanced") -> Dict[str, Any]:
    """Suggest rebalancing weights based on goal: balanced / growth / conservative / income."""
    if not positions:
        return {"success": False, "error": "Empty portfolio"}

    enriched = []
    for p in positions:
        sym = p.get('symbol')
        if not sym:
            continue
        info = _cached(f"info::{sym}", lambda s=sym: _fetch_info(s), ttl=600)
        hist = _cached(f"hist::{sym}", lambda s=sym: _fetch_history(s, "1y"))
        if not hist:
            continue
        closes = hist['close']
        rets = [(closes[i] / closes[i - 1] - 1) for i in range(1, len(closes)) if closes[i - 1] > 0]
        if not rets:
            continue
        m = sum(rets) / len(rets)
        s = statistics.stdev(rets) if len(rets) > 1 else 0.01
        ann_ret = m * 252
        ann_vol = s * math.sqrt(252)
        last = closes[-1]
        qty = float(p.get('quantity', 0))
        avg_price = float(p.get('avg_price', last))
        value = qty * last
        score = 0.0

        # Goal-specific scoring
        if goal == "growth":
            score = (ann_ret - 0.5 * ann_vol) * 100  # high return, mild vol penalty
            score += (info.get('revenueGrowth', 0) or 0) * 50
        elif goal == "conservative":
            score = -ann_vol * 100
            score += (info.get('dividendYield', 0) or 0) * 1000
            beta = info.get('beta', 1) or 1
            score -= max(0, beta - 1) * 20
        elif goal == "income":
            dy = info.get('dividendYield', 0) or 0
            if 0 < dy < 0.15:
                dy *= 100
            score = dy * 5
            score -= ann_vol * 30
        else:  # balanced
            sharpe = ann_ret / ann_vol if ann_vol > 0 else 0
            score = sharpe * 30
            score += (info.get('returnOnEquity', 0) or 0) * 20

        enriched.append({
            "symbol": sym,
            "current_value": round(value, 2),
            "ann_return_pct": round(ann_ret * 100, 2),
            "ann_vol_pct": round(ann_vol * 100, 2),
            "sharpe": round(ann_ret / ann_vol, 2) if ann_vol > 0 else 0,
            "score": round(score, 2),
        })

    if not enriched:
        return {"success": False, "error": "Could not load position data"}

    total_value = sum(p['current_value'] for p in enriched) or 1

    # Soft-allocate by score (shifted to non-negative)
    min_score = min(p['score'] for p in enriched)
    shifted = [max(p['score'] - min_score + 1, 0.5) for p in enriched]
    total_w = sum(shifted)
    target_weights = [w / total_w for w in shifted]

    # Bound between 5% and 35%
    target_weights = [min(0.35, max(0.05, w)) for w in target_weights]
    s = sum(target_weights)
    target_weights = [w / s for w in target_weights]

    suggestions = []
    for i, p in enumerate(enriched):
        cur_w = p['current_value'] / total_value
        tgt_w = target_weights[i]
        diff_pct = (tgt_w - cur_w) * 100
        diff_value = (tgt_w - cur_w) * total_value
        action = "BUY" if diff_value > total_value * 0.02 else (
            "SELL" if diff_value < -total_value * 0.02 else "HOLD")
        suggestions.append({
            **p,
            "current_weight_pct": round(cur_w * 100, 2),
            "target_weight_pct": round(tgt_w * 100, 2),
            "delta_pct": round(diff_pct, 2),
            "delta_value": round(diff_value, 2),
            "action": action,
        })

    suggestions.sort(key=lambda x: -x['target_weight_pct'])
    return {
        "success": True,
        "goal": goal,
        "total_value": round(total_value, 2),
        "rebalance_suggestions": suggestions,
        "summary": {
            "buy_count": sum(1 for s in suggestions if s['action'] == 'BUY'),
            "sell_count": sum(1 for s in suggestions if s['action'] == 'SELL'),
            "hold_count": sum(1 for s in suggestions if s['action'] == 'HOLD'),
            "max_overweight": max(suggestions, key=lambda x: x['delta_pct'])['symbol'] if suggestions else None,
            "max_underweight": min(suggestions, key=lambda x: x['delta_pct'])['symbol'] if suggestions else None,
        },
    }


# ============================================================================
# 5. AI TRADE IDEAS
# ============================================================================

TRADE_IDEA_UNIVERSE_US = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD", "NFLX", "AVGO",
    "CRM", "ORCL", "ADBE", "JPM", "V", "MA", "UNH", "LLY", "WMT", "COST",
    "XOM", "CVX", "BA", "CAT", "PYPL", "SHOP", "PLTR", "SNOW", "CRWD", "NET",
]

TRADE_IDEA_UNIVERSE_HK = [
    "0700.HK", "9988.HK", "3690.HK", "1810.HK", "9618.HK",
    "0005.HK", "0939.HK", "1398.HK", "3988.HK", "2318.HK",
    "0388.HK", "0941.HK", "1299.HK", "0001.HK", "0002.HK",
    "0883.HK", "0386.HK", "1024.HK", "0027.HK", "1109.HK",
]

# Back-compat alias
TRADE_IDEA_UNIVERSE = TRADE_IDEA_UNIVERSE_US


def daily_trade_ideas(count: int = 5, risk: str = "medium", market: str = "all") -> Dict[str, Any]:
    """Generate daily AI-curated trade ideas.

    market: 'us' | 'hk' | 'all'
    """
    from .pro_signals import generate_signal

    m = (market or "all").lower()
    if m == "us":
        universe = TRADE_IDEA_UNIVERSE_US
    elif m == "hk":
        universe = TRADE_IDEA_UNIVERSE_HK
    else:
        universe = TRADE_IDEA_UNIVERSE_US + TRADE_IDEA_UNIVERSE_HK

    candidates = []
    for sym in universe:
        sig = generate_signal(sym)
        if not sig.get("success"):
            continue
        candidates.append(sig)

    # Filter by risk
    if risk == "low":
        candidates = [c for c in candidates if c['signal'] in ('BUY', 'STRONG_BUY') and c['confidence_pct'] > 60]
    elif risk == "high":
        candidates = [c for c in candidates if c['signal'] in ('STRONG_BUY', 'STRONG_SELL')]
    else:
        candidates = [c for c in candidates if abs(c['score']) > 0.2]

    candidates.sort(key=lambda x: -abs(x['score']) * (x['confidence_pct'] / 100))

    ideas = []
    for c in candidates[:count]:
        idea_type = "LONG" if c['score'] > 0 else "SHORT"
        ideas.append({
            "symbol": c['symbol'],
            "idea": idea_type,
            "signal": c['signal'],
            "entry": c['current_price'],
            "target": c['target_price'],
            "stop": c['stop_loss'],
            "confidence": c['confidence_pct'],
            "horizon": c['horizon'],
            "thesis": c['thesis'][:3],
            "potential_return_pct": round(((c['target_price'] / c['current_price']) - 1) * 100, 2)
                if c.get('target_price') and c['current_price'] else None,
            "risk_reward": round(abs((c['target_price'] - c['current_price']) /
                                     (c['current_price'] - c['stop_loss'])), 2)
                if c.get('target_price') and c.get('stop_loss') and c['current_price'] != c['stop_loss'] else None,
        })

    return {
        "success": True,
        "risk_profile": risk,
        "market": m,
        "count": len(ideas),
        "ideas": ideas,
        "generated_at": time.strftime("%Y-%m-%d %H:%M"),
    }


# ----------------------------------------------------------------------------
# Daily AI ideas — email digest
# ----------------------------------------------------------------------------

def _render_ai_ideas_email_html(payload: Dict[str, Any]) -> str:
    """Render a trade-ideas payload (output of daily_trade_ideas) as HTML email."""
    ideas = payload.get('ideas') or []
    market = (payload.get('market') or 'all').upper()
    risk = payload.get('risk_profile', 'medium')
    generated = payload.get('generated_at', '')

    if not ideas:
        rows_html = (
            "<tr><td colspan='6' style='padding:18px;text-align:center;color:#888;'>"
            "今日無高置信度的交易機會 — 建議觀望</td></tr>"
        )
    else:
        def _fmt(v, nd=2):
            try:
                return f"${float(v):,.{nd}f}"
            except Exception:
                return "—"

        def _pct(v):
            try:
                return f"{float(v):+.2f}%"
            except Exception:
                return "—"

        rows = []
        for i, idea in enumerate(ideas, 1):
            side = idea.get('idea', '')
            side_color = '#16a34a' if side == 'LONG' else '#dc2626'
            ret_pct = idea.get('potential_return_pct')
            ret_color = '#16a34a' if (ret_pct or 0) >= 0 else '#dc2626'
            thesis_html = ''.join(
                f"<li style='margin:2px 0;'>{t}</li>" for t in (idea.get('thesis') or [])[:3]
            )
            rows.append(f"""
              <tr>
                <td style="padding:10px 8px;font-weight:700;color:#1a223a;">#{i}</td>
                <td style="padding:10px 8px;">
                  <div style="font-weight:800;font-size:15px;color:#1a223a;">{idea.get('symbol','')}</div>
                  <div style="font-size:11px;color:#888;margin-top:2px;">{idea.get('signal','').replace('_',' ')} · 置信 {idea.get('confidence','—')}% · {idea.get('horizon','')}</div>
                </td>
                <td style="padding:10px 8px;text-align:center;">
                  <span style="display:inline-block;padding:3px 10px;border-radius:4px;background:{side_color};color:#fff;font-weight:700;font-size:12px;">{side}</span>
                </td>
                <td style="padding:10px 8px;text-align:right;font-family:monospace;font-size:13px;">
                  進 {_fmt(idea.get('entry'))}<br>
                  <span style="color:#16a34a;">目 {_fmt(idea.get('target'))}</span><br>
                  <span style="color:#dc2626;">損 {_fmt(idea.get('stop'))}</span>
                </td>
                <td style="padding:10px 8px;text-align:right;font-weight:700;color:{ret_color};">{_pct(ret_pct)}</td>
                <td style="padding:10px 8px;font-size:12px;color:#444;">
                  <ul style="margin:0;padding-left:16px;">{thesis_html}</ul>
                </td>
              </tr>""")
        rows_html = ''.join(rows)

    return f"""<!DOCTYPE html><html><body style="font-family:Inter,Arial,sans-serif;background:#f5f7fb;margin:0;padding:20px;">
<div style="max-width:780px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <h2 style="margin:0 0 4px;color:#1a223a;">💡 每日 AI 交易靈感</h2>
  <p style="color:#666;font-size:13px;margin:0 0 16px;">
    {generated} · 市場 <strong>{market}</strong> · {risk} 風險偏好 · {len(ideas)} 個機會
  </p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e5e7eb;">
    <thead style="background:#f5f7fb;color:#666;">
      <tr>
        <th style="padding:8px;text-align:left;">#</th>
        <th style="padding:8px;text-align:left;">股票</th>
        <th style="padding:8px;text-align:center;">方向</th>
        <th style="padding:8px;text-align:right;">價位</th>
        <th style="padding:8px;text-align:right;">回報</th>
        <th style="padding:8px;text-align:left;">論點</th>
      </tr>
    </thead>
    <tbody>{rows_html}</tbody>
  </table>
  <p style="font-size:11px;color:#888;margin-top:18px;line-height:1.5;">
    ⚠️ 此內容由 AI 模型自動生成，僅供參考，並非投資建議。<br>
    交易具風險，過往表現不代表未來結果。請依自身風險承受能力作出決定。
  </p>
</div></body></html>"""


def send_daily_ai_ideas() -> Dict[str, Any]:
    """Iterate every user with ai_ideas_email=True and email them today's ideas.

    Each user gets ideas tailored to their saved market/risk preferences.
    """
    import sqlite3
    from pathlib import Path
    try:
        from .notify import get_prefs, send_email
    except ImportError:
        from modules.notify import get_prefs, send_email  # type: ignore

    db_path = Path(__file__).resolve().parents[1] / 'trading_agents.db'
    sent = 0
    skipped = 0
    errors: List[str] = []

    conn = sqlite3.connect(str(db_path))
    try:
        rows = conn.execute('SELECT id FROM users').fetchall()
    finally:
        conn.close()

    for (uid,) in rows:
        try:
            prefs = get_prefs(uid)
            if not prefs.get('ai_ideas_email') or not prefs.get('email'):
                skipped += 1
                continue
            market = prefs.get('ai_ideas_market', 'all')
            risk = prefs.get('ai_ideas_risk', 'medium')
            payload = daily_trade_ideas(count=5, risk=risk, market=market)
            if not payload.get('success'):
                skipped += 1
                continue
            html = _render_ai_ideas_email_html(payload)
            subject = f"💡 每日 AI 交易靈感 — {payload.get('generated_at','')[:10]}"
            ok = send_email(prefs['email'], subject, html)
            if ok:
                sent += 1
            else:
                skipped += 1
                errors.append(f"user {uid}: send_email returned False")
        except Exception as e:
            errors.append(f"user {uid}: {e}")
    return {'success': True, 'sent': sent, 'skipped': skipped, 'errors': errors[:10]}


def email_ai_ideas_to_user(user_id: int,
                           market: Optional[str] = None,
                           risk: Optional[str] = None,
                           count: int = 5) -> Dict[str, Any]:
    """Send today's AI ideas to a single user right now (used by manual button).

    market/risk default to the user's saved prefs.
    """
    try:
        from .notify import get_prefs, send_email
    except ImportError:
        from modules.notify import get_prefs, send_email  # type: ignore

    prefs = get_prefs(user_id)
    if not prefs.get('email'):
        return {'success': False, 'error': '帳號未設定 email'}
    m = market or prefs.get('ai_ideas_market', 'all')
    r = risk or prefs.get('ai_ideas_risk', 'medium')
    payload = daily_trade_ideas(count=count, risk=r, market=m)
    if not payload.get('success'):
        return {'success': False, 'error': payload.get('error', '無法生成靈感')}
    html = _render_ai_ideas_email_html(payload)
    subject = f"💡 每日 AI 交易靈感 — {payload.get('generated_at','')[:10]}"
    ok = send_email(prefs['email'], subject, html)
    return {
        'success': bool(ok),
        'email': prefs['email'],
        'count': payload.get('count', 0),
        'market': payload.get('market'),
        'risk_profile': payload.get('risk_profile'),
    }


# ============================================================================
# 6. AI SECTOR ROTATION
# ============================================================================

SECTOR_ETFS = [
    {"sym": "XLK", "name": "Technology"},
    {"sym": "XLF", "name": "Financials"},
    {"sym": "XLV", "name": "Healthcare"},
    {"sym": "XLY", "name": "Consumer Discretionary"},
    {"sym": "XLP", "name": "Consumer Staples"},
    {"sym": "XLE", "name": "Energy"},
    {"sym": "XLI", "name": "Industrials"},
    {"sym": "XLB", "name": "Materials"},
    {"sym": "XLU", "name": "Utilities"},
    {"sym": "XLRE", "name": "Real Estate"},
    {"sym": "XLC", "name": "Communications"},
]


def sector_rotation() -> Dict[str, Any]:
    """Track sector momentum for rotation signals."""
    benchmark_hist = _cached("hist::SPY", lambda: _fetch_history("SPY", "6mo"))
    if not benchmark_hist:
        return {"success": False, "error": "Could not load benchmark"}

    bench_closes = benchmark_hist['close']

    sectors = []
    for s in SECTOR_ETFS:
        h = _cached(f"hist::{s['sym']}", lambda x=s['sym']: _fetch_history(x, "6mo"))
        if not h or len(h['close']) < 60:
            continue
        c = h['close']

        def chg(days):
            if len(c) > days:
                return (c[-1] / c[-days - 1] - 1) * 100
            return None

        # Relative strength vs benchmark (last 1M)
        if len(bench_closes) >= 22 and len(c) >= 22:
            sector_chg = c[-1] / c[-22] - 1
            bench_chg = bench_closes[-1] / bench_closes[-22] - 1
            rel_strength = (sector_chg - bench_chg) * 100
        else:
            rel_strength = None

        sectors.append({
            "symbol": s['sym'],
            "name": s['name'],
            "price": round(c[-1], 2),
            "change_1w_pct": round(chg(5), 2) if chg(5) is not None else None,
            "change_1m_pct": round(chg(22), 2) if chg(22) is not None else None,
            "change_3m_pct": round(chg(63), 2) if chg(63) is not None else None,
            "change_6m_pct": round(chg(126), 2) if chg(126) is not None else None,
            "rel_strength_1m_pct": round(rel_strength, 2) if rel_strength is not None else None,
        })

    sectors.sort(key=lambda x: -(x.get('rel_strength_1m_pct') or -999))

    leaders = sectors[:3]
    laggards = sectors[-3:]

    rotation_signal = ""
    if leaders:
        defensive = ['Utilities', 'Consumer Staples', 'Healthcare']
        cyclical = ['Technology', 'Consumer Discretionary', 'Financials', 'Industrials']
        leader_names = [l['name'] for l in leaders]
        defensive_in_leaders = sum(1 for n in leader_names if n in defensive)
        cyclical_in_leaders = sum(1 for n in leader_names if n in cyclical)
        if defensive_in_leaders >= 2:
            rotation_signal = "🛡️ 防禦性板塊領漲 — 市場可能進入避險模式"
        elif cyclical_in_leaders >= 2:
            rotation_signal = "🚀 週期性板塊領漲 — 經濟擴張階段"
        else:
            rotation_signal = "⚖️ 板塊輪動均衡 — 無明顯主導趨勢"

    return {
        "success": True,
        "sectors": sectors,
        "leaders": leaders,
        "laggards": laggards,
        "rotation_signal": rotation_signal,
    }


# ============================================================================
# 7. AI RISK SCORE — composite 0-100
# ============================================================================

def ai_risk_score(symbol: str) -> Dict[str, Any]:
    info = _cached(f"info::{symbol}", lambda: _fetch_info(symbol), ttl=600)
    hist = _cached(f"hist::{symbol}", lambda: _fetch_history(symbol, "1y"))
    if not info or not hist:
        return {"success": False, "error": "Could not load data"}

    closes = hist['close']
    rets = [(closes[i] / closes[i - 1] - 1) for i in range(1, len(closes)) if closes[i - 1] > 0]

    components = {}

    # Volatility component (0-100, higher vol = higher risk)
    if rets and len(rets) > 20:
        ann_vol = statistics.stdev(rets) * math.sqrt(252) * 100
        components['volatility'] = min(100, max(0, ann_vol * 1.5))

    # Drawdown component
    peak = closes[0]
    max_dd = 0
    for c in closes:
        if c > peak:
            peak = c
        dd = (peak - c) / peak * 100
        if dd > max_dd:
            max_dd = dd
    components['drawdown'] = min(100, max_dd * 1.2)

    # Beta component
    beta = info.get('beta', 1) or 1
    components['beta'] = min(100, abs(beta) * 30)

    # Leverage component
    de = info.get('debtToEquity', 0) or 0
    components['leverage'] = min(100, de / 2)

    # Profitability component (LOW profitability = HIGH risk)
    pm = info.get('profitMargins', 0) or 0
    components['profitability'] = max(0, min(100, 50 - pm * 200))

    # Liquidity component (smaller cap = higher risk)
    mc = info.get('marketCap', 1e9) or 1e9
    if mc < 1e9:
        components['liquidity'] = 80
    elif mc < 1e10:
        components['liquidity'] = 50
    elif mc < 1e11:
        components['liquidity'] = 30
    else:
        components['liquidity'] = 15

    if not components:
        return {"success": False, "error": "No metrics available"}

    composite = sum(components.values()) / len(components)

    if composite < 25:
        grade = "A — 低風險"
        color = "green"
    elif composite < 45:
        grade = "B — 中低風險"
        color = "blue"
    elif composite < 65:
        grade = "C — 中高風險"
        color = "gold"
    elif composite < 80:
        grade = "D — 高風險"
        color = "orange"
    else:
        grade = "F — 極高風險"
        color = "red"

    return {
        "success": True,
        "symbol": symbol.upper(),
        "name": info.get('shortName') or symbol,
        "ai_risk_score": round(composite, 1),
        "grade": grade,
        "color": color,
        "components": {k: round(v, 1) for k, v in components.items()},
        "interpretation": _risk_interpretation(composite, components),
    }


def _risk_interpretation(score, components):
    items = []
    sorted_comps = sorted(components.items(), key=lambda x: -x[1])
    top_risk = sorted_comps[0]
    items.append(f"🔍 主要風險來源: **{top_risk[0]}** ({top_risk[1]:.0f}/100)")
    if score < 40:
        items.append("✅ 適合保守投資者，可作核心持倉")
    elif score < 65:
        items.append("⚖️ 適合平衡型投資者，建議配置 5-10% 倉位")
    else:
        items.append("⚠️ 高風險，僅建議資深投資者，倉位 < 5%")
    return items


# ============================================================================
# 8. AI STOCK COMPARISON
# ============================================================================

def compare_stocks(symbols: List[str]) -> Dict[str, Any]:
    """Side-by-side AI comparison of 2-5 stocks."""
    if len(symbols) < 2:
        return {"success": False, "error": "Need at least 2 symbols"}
    if len(symbols) > 5:
        symbols = symbols[:5]

    rows = []
    for sym in symbols:
        info = _cached(f"info::{sym}", lambda s=sym: _fetch_info(s), ttl=600)
        hist = _cached(f"hist::{sym}", lambda s=sym: _fetch_history(s, "1y"))
        if not info or not hist:
            continue
        closes = hist['close']
        rets = [(closes[i] / closes[i - 1] - 1) for i in range(1, len(closes))]

        ann_ret = (sum(rets) / len(rets)) * 252 * 100 if rets else 0
        ann_vol = statistics.stdev(rets) * math.sqrt(252) * 100 if len(rets) > 1 else 0
        sharpe = (ann_ret - 4) / ann_vol if ann_vol > 0 else 0

        dy = info.get('dividendYield', 0) or 0
        if 0 < dy < 0.15:
            dy *= 100

        rows.append({
            "symbol": sym.upper(),
            "name": info.get('shortName') or sym,
            "price": round(closes[-1], 2),
            "market_cap": info.get('marketCap'),
            "pe": info.get('trailingPE'),
            "pb": info.get('priceToBook'),
            "ps": info.get('priceToSalesTrailing12Months'),
            "roe_pct": (info.get('returnOnEquity', 0) or 0) * 100,
            "profit_margin_pct": (info.get('profitMargins', 0) or 0) * 100,
            "revenue_growth_pct": (info.get('revenueGrowth', 0) or 0) * 100,
            "earnings_growth_pct": (info.get('earningsGrowth', 0) or 0) * 100,
            "dividend_yield_pct": round(dy, 2),
            "beta": info.get('beta'),
            "ann_return_pct": round(ann_ret, 2),
            "ann_vol_pct": round(ann_vol, 2),
            "sharpe": round(sharpe, 2),
            "ytd_change_pct": round((closes[-1] / closes[0] - 1) * 100, 2),
        })

    # Find winner per metric
    winners = {}
    metric_dirs = {
        "pe": "min", "pb": "min", "ps": "min", "ann_vol_pct": "min",
        "roe_pct": "max", "profit_margin_pct": "max", "revenue_growth_pct": "max",
        "earnings_growth_pct": "max", "dividend_yield_pct": "max",
        "ann_return_pct": "max", "sharpe": "max", "ytd_change_pct": "max",
    }
    for metric, direction in metric_dirs.items():
        valid = [(r['symbol'], r[metric]) for r in rows if r.get(metric) is not None and r[metric] != 0]
        if not valid:
            continue
        if direction == "max":
            winner = max(valid, key=lambda x: x[1])
        else:
            winner = min(valid, key=lambda x: x[1])
        winners[metric] = winner[0]

    # Overall AI verdict
    win_counts = {}
    for sym in winners.values():
        win_counts[sym] = win_counts.get(sym, 0) + 1
    overall_winner = max(win_counts.items(), key=lambda x: x[1]) if win_counts else (None, 0)

    return {
        "success": True,
        "stocks": rows,
        "winners_by_metric": winners,
        "overall_winner": overall_winner[0],
        "win_counts": win_counts,
    }
