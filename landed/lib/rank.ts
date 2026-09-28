// Which source is "cheapest"? Pure; tests/rank.test.ts.
//
// Not the lowest number. PriceArb's first dashboard sorted by raw spread and
// its top row was a $15 replacement straw matched to a $225 tumbler. A price
// is only as cheap as our belief that it is (a) the same product and (b) from
// a seller who will deliver it. So offers compete on
//     effective cost = landed ÷ (match confidence × seller reliability)
// and anything that weakens the evidence is said out loud in `whyLow`.

export interface RankableOffer {
  offerId: number;
  landedPerUnitHkdCents: number;
  /** 0..1 — how sure we are this offer is the product. Anchor offer = 1. */
  matchConfidence: number;
  /** 0..1 — observed fill rate; null when we have no history with this seller. */
  supplierReliability: number | null;
  inStock: boolean;
  isAccessory: boolean;
  sellerRating?: number | null;
  moqForced?: boolean;
  priceAgeHours?: number | null;
  /** False for B2B sources an individual cannot check out on (default true). */
  consumerAccessible?: boolean;
  /** Item price far below the rest of its cluster — usually a teaser, part, or parse error. */
  priceOutlier?: boolean;
  /** Luxury goods from a source with endemic counterfeits (see lib/luxury/risk.ts). */
  highCounterfeitRisk?: boolean;
}

/** An offer this far below its cluster's median item price is presumed wrong until verified. */
export const OUTLIER_RATIO = 0.4;

/**
 * Indices of suspiciously low prices. Needs ≥3 prices for a meaningful median;
 * the biggest "saving" in a comparison is, more often than not, a mistake.
 */
export function lowOutliers(prices: number[], ratio = OUTLIER_RATIO): Set<number> {
  const out = new Set<number>();
  if (prices.length < 3) return out;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  prices.forEach((p, i) => {
    if (p < median * ratio) out.add(i);
  });
  return out;
}

export interface RankedOffer extends RankableOffer {
  effectiveCostHkdCents: number;
  eligibleForBest: boolean;
  whyLow: string[];
}

export const UNKNOWN_SELLER_RELIABILITY = 0.85;
export const MIN_MATCH_FOR_BEST = 0.6;
export const STALE_PRICE_HOURS = 72;

export function effectiveCost(o: RankableOffer): number {
  const conf = Math.max(0.01, Math.min(1, o.matchConfidence));
  const rel = Math.max(0.01, Math.min(1, o.supplierReliability ?? UNKNOWN_SELLER_RELIABILITY));
  return Math.round(o.landedPerUnitHkdCents / (conf * rel));
}

export function rankOffers(
  offers: RankableOffer[],
  opts: { productIsAccessory?: boolean } = {},
): { ranked: RankedOffer[]; bestOfferId: number | null } {
  const ranked: RankedOffer[] = offers.map((o) => {
    const whyLow: string[] = [];
    // An accessory is only suspicious when the product itself is not one: a strap
    // page should still be able to name its cheapest strap.
    const accessoryMismatch = o.isAccessory && !opts.productIsAccessory;
    if (!o.inStock) whyLow.push("缺貨 Out of stock");
    if (accessoryMismatch) whyLow.push("疑似配件 Looks like an accessory");
    if (o.matchConfidence < MIN_MATCH_FOR_BEST) whyLow.push("未確認同款 Not confirmed as the same product");
    else if (o.matchConfidence < 0.85) whyLow.push("同款置信度一般 Match confidence moderate");
    if (o.supplierReliability == null) whyLow.push("未有交易紀錄 No order history with this seller");
    else if (o.supplierReliability < 0.9) whyLow.push("賣家履約率偏低 Seller fill rate below 90%");
    if (o.sellerRating != null && o.sellerRating < 4) whyLow.push("賣家評分低於 4 Seller rating under 4");
    if (o.moqForced) whyLow.push("需要買足最低訂購量 Must buy the minimum order quantity");
    const unverifiedOutlier = o.priceOutlier === true && o.matchConfidence < 0.85;
    if (unverifiedOutlier) whyLow.push("價格異常低，未核實 Suspiciously low vs other sources — unverified");
    if (o.highCounterfeitRisk) whyLow.push("高仿風險，唔會當成最平 High counterfeit risk — never shown as cheapest");
    if (o.consumerAccessible === false) whyLow.push("批發平台，個人難直接落單 Wholesale platform — hard to buy as an individual");
    if (o.priceAgeHours != null && o.priceAgeHours > STALE_PRICE_HOURS) {
      whyLow.push(`價格 ${Math.round(o.priceAgeHours)} 小時前更新 Price may be stale`);
    }
    const eligibleForBest =
      o.inStock &&
      !accessoryMismatch &&
      !o.moqForced &&
      o.consumerAccessible !== false &&
      !unverifiedOutlier &&
      !o.highCounterfeitRisk &&
      o.matchConfidence >= MIN_MATCH_FOR_BEST;
    return { ...o, effectiveCostHkdCents: effectiveCost(o), eligibleForBest, whyLow };
  });

  ranked.sort((a, b) => {
    if (a.eligibleForBest !== b.eligibleForBest) return a.eligibleForBest ? -1 : 1;
    return a.effectiveCostHkdCents - b.effectiveCostHkdCents;
  });
  const best = ranked.find((r) => r.eligibleForBest);
  return { ranked, bestOfferId: best ? best.offerId : null };
}
