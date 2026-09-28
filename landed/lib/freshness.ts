// "Crawl every product daily" within a budget. Pure; tests/freshness.test.ts.
//
// Nobody can re-price the whole internet every day — and nobody needs to. What
// needs a fresh price is whatever money or attention currently depends on:
//   HOT  (6h)  — a live channel listing, an open pool, or an open order
//   WARM (24h) — someone is watching it, or it was searched this week
//   COLD (7d)  — everything else we have ever seen

export type FreshnessTier = "HOT" | "WARM" | "COLD";

export const TIER_HOURS: Record<FreshnessTier, number> = { HOT: 6, WARM: 24, COLD: 168 };

export interface FreshnessSignals {
  liveListings: number;
  openPools: number;
  openOrders: number;
  activeWatches: number;
  searchedWithinDays: number | null;
}

export function freshnessTier(s: FreshnessSignals): FreshnessTier {
  if (s.liveListings > 0 || s.openPools > 0 || s.openOrders > 0) return "HOT";
  if (s.activeWatches > 0 || (s.searchedWithinDays != null && s.searchedWithinDays <= 7)) return "WARM";
  return "COLD";
}

export function isDue(lastPricedAt: Date | null, tier: FreshnessTier, now: Date): boolean {
  if (!lastPricedAt) return true;
  return now.getTime() - lastPricedAt.getTime() >= TIER_HOURS[tier] * 3600_000;
}
