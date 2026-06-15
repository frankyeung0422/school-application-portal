"""MacauSlot vs HKJC odds comparison endpoints."""
from __future__ import annotations

import time
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Query
from loguru import logger

from src.python.services.macauslot_odds_service import (
    fetch_and_save_odds,
    get_hkjc_vs_macauslot_comparison,
)

router = APIRouter()

# Simple in-memory TTL cache (5 minutes)
_cache: Dict[str, Any] = {}
_CACHE_TTL = 300


def _cached_comparison(days_ahead: int) -> Dict:
    key = f"macauslot_cmp_{days_ahead}"
    now = time.time()
    entry = _cache.get(key)
    if entry and now - entry["ts"] < _CACHE_TTL:
        return entry["payload"]
    comparisons = get_hkjc_vs_macauslot_comparison(days_ahead=days_ahead)
    payload = {
        "comparisons": comparisons,
        "total": len(comparisons),
        "collected_at": datetime.utcnow().isoformat(),
        "days_ahead": days_ahead,
    }
    _cache[key] = {"ts": now, "payload": payload}
    return payload


@router.get("/macauslot/comparison")
async def macauslot_comparison(
    days_ahead: int = Query(3, ge=1, le=7, description="Look-ahead window in days"),
    refresh: bool = Query(False, description="Force refresh (bypass 5-min cache)"),
):
    """
    Matches where HKJC odds beat MacauSlot — bet at HKJC for better value.

    Returns comparisons sorted by best_gap_pct descending.
    Each item has `advantages` listing every market where HKJC > MacauSlot.
    """
    if refresh:
        key = f"macauslot_cmp_{days_ahead}"
        _cache.pop(key, None)
    return _cached_comparison(days_ahead=days_ahead)


@router.post("/macauslot/refresh")
async def macauslot_refresh():
    """Trigger on-demand MacauSlot odds scrape and invalidate comparison cache."""
    saved = fetch_and_save_odds()
    # Invalidate all cached comparisons
    for key in list(_cache.keys()):
        if key.startswith("macauslot_cmp_"):
            _cache.pop(key, None)
    logger.info(f"MacauSlot manual refresh: {saved} rows saved")
    return {"saved": saved, "refreshed_at": datetime.utcnow().isoformat()}


@router.get("/macauslot/alert-summary")
async def macauslot_alert_summary(
    min_gap_pct: float = Query(3.0, description="Only count opportunities above this gap threshold"),
):
    """
    Lightweight alert summary — returns counts without full match payload.
    Poll this frequently (e.g. every 60s) to drive badge/toast without heavy data load.
    """
    data = _cached_comparison(days_ahead=3)
    comparisons = data.get("comparisons", [])

    hot = [c for c in comparisons if c["best_gap_pct"] >= min_gap_pct]
    big = [c for c in comparisons if c["best_gap_pct"] >= 10.0]
    top = max((c["best_gap_pct"] for c in comparisons), default=0.0)

    # Find the single best opportunity for the alert toast
    best: dict | None = None
    if hot:
        best_c = hot[0]
        best_adv = best_c["advantages"][0] if best_c["advantages"] else None
        if best_adv:
            home = (best_c.get("home_team_ch") or best_c.get("home_team", "")).strip()
            away = (best_c.get("away_team_ch") or best_c.get("away_team", "")).strip()
            best = {
                "match": f"{home} vs {away}",
                "market": best_adv["market"],
                "outcome": best_adv["outcome"],
                "hkjc_odds": best_adv["hkjc_odds"],
                "macauslot_odds": best_adv["macauslot_odds"],
                "gap_pct": best_adv["gap_pct"],
            }

    return {
        "total_opportunities": len(hot),
        "big_gap_count": len(big),
        "best_gap_pct": round(top, 2),
        "best_opportunity": best,
        "collected_at": data.get("collected_at"),
    }


@router.get("/macauslot/status")
async def macauslot_status():
    """Diagnostic: how many MacauSlot odds rows are in the DB and how fresh."""
    from config.database import SessionLocal
    from src.models.database_models import MacauSlotOdds
    from datetime import timedelta
    db = SessionLocal()
    try:
        total = db.query(MacauSlotOdds).count()
        latest = (
            db.query(MacauSlotOdds)
            .order_by(MacauSlotOdds.collected_at.desc())
            .first()
        )
        return {
            "total_rows": total,
            "latest_collected_at": latest.collected_at.isoformat() if latest else None,
            "age_minutes": round(
                (datetime.utcnow() - latest.collected_at).total_seconds() / 60, 1
            ) if latest else None,
        }
    finally:
        db.close()
