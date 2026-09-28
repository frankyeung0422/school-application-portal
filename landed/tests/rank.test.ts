import { describe, expect, it } from "vitest";
import { effectiveCost, lowOutliers, rankOffers, type RankableOffer } from "../lib/rank";
import { buySignal } from "../lib/passport";

const base: RankableOffer = {
  offerId: 1,
  landedPerUnitHkdCents: 20000,
  matchConfidence: 1,
  supplierReliability: 0.95,
  inStock: true,
  isAccessory: false,
};

describe("rankOffers", () => {
  it("a mismatched cheap accessory never ranks first", () => {
    const { ranked, bestOfferId } = rankOffers([
      { ...base, offerId: 1, landedPerUnitHkdCents: 20000 },
      { ...base, offerId: 2, landedPerUnitHkdCents: 1500, isAccessory: true, matchConfidence: 0.4 },
    ]);
    expect(bestOfferId).toBe(1);
    expect(ranked[0].offerId).toBe(1);
    expect(ranked[1].whyLow.join(" ")).toMatch(/accessory/);
  });

  it("on an accessory's own product page, accessory offers can be best", () => {
    const { bestOfferId } = rankOffers([{ ...base, offerId: 7, isAccessory: true }], { productIsAccessory: true });
    expect(bestOfferId).toBe(7);
  });

  it("a slightly cheaper but unconfirmed offer loses to a confirmed one", () => {
    const { bestOfferId } = rankOffers([
      { ...base, offerId: 1, landedPerUnitHkdCents: 20000, matchConfidence: 1 },
      { ...base, offerId: 2, landedPerUnitHkdCents: 18000, matchConfidence: 0.62, supplierReliability: null },
    ]);
    expect(bestOfferId).toBe(1);
  });

  it("out-of-stock and MOQ-forced offers are shown but cannot be best", () => {
    const { bestOfferId, ranked } = rankOffers([
      { ...base, offerId: 1, landedPerUnitHkdCents: 9000, inStock: false },
      { ...base, offerId: 2, landedPerUnitHkdCents: 9500, moqForced: true },
      { ...base, offerId: 3, landedPerUnitHkdCents: 30000 },
    ]);
    expect(bestOfferId).toBe(3);
    expect(ranked).toHaveLength(3);
  });

  it("a B2B-only source is shown but never 'the price you could get yourself'", () => {
    const { bestOfferId, ranked } = rankOffers([
      { ...base, offerId: 1, landedPerUnitHkdCents: 9000, consumerAccessible: false },
      { ...base, offerId: 2, landedPerUnitHkdCents: 15000 },
    ]);
    expect(bestOfferId).toBe(2);
    expect(ranked.find((r) => r.offerId === 1)!.whyLow.join(" ")).toMatch(/Wholesale/);
  });

  it("a suspiciously low unverified price is flagged and cannot be best", () => {
    expect([...lowOutliers([54, 176, 208, 650])]).toEqual([0]);
    expect(lowOutliers([54, 176]).size).toBe(0);
    const { bestOfferId, ranked } = rankOffers([
      { ...base, offerId: 1, landedPerUnitHkdCents: 17500, matchConfidence: 0.7, priceOutlier: true },
      { ...base, offerId: 2, landedPerUnitHkdCents: 30000, matchConfidence: 1 },
    ]);
    expect(bestOfferId).toBe(2);
    expect(ranked.find((r) => r.offerId === 1)!.whyLow.join(" ")).toMatch(/Suspiciously low/);
    // A human-verified low price is allowed to win.
    expect(rankOffers([{ ...base, offerId: 1, matchConfidence: 1, priceOutlier: true }]).bestOfferId).toBe(1);
  });

  it("returns null when nothing is trustworthy", () => {
    expect(rankOffers([{ ...base, matchConfidence: 0.3 }]).bestOfferId).toBeNull();
  });

  it("effective cost divides by confidence × reliability", () => {
    expect(effectiveCost({ ...base, landedPerUnitHkdCents: 10000, matchConfidence: 0.5, supplierReliability: 1 })).toBe(20000);
  });

  it("flags stale prices", () => {
    const { ranked } = rankOffers([{ ...base, priceAgeHours: 100 }]);
    expect(ranked[0].whyLow.join(" ")).toMatch(/stale/);
  });
});

describe("buySignal", () => {
  it("refuses to guess with thin history", () => {
    expect(buySignal({ dailyBestCents: [100, 90], currentCents: 90 }).signal).toBe("NOT_ENOUGH_DATA");
  });
  it("BUY_NOW near the low, WAIT above the median", () => {
    const hist = [20000, 21000, 19000, 22000, 20500, 19500, 21500, 20000];
    expect(buySignal({ dailyBestCents: hist, currentCents: 19100 }).signal).toBe("BUY_NOW");
    expect(buySignal({ dailyBestCents: hist, currentCents: 20000 }).signal).toBe("FAIR");
    expect(buySignal({ dailyBestCents: hist, currentCents: 23000 }).signal).toBe("WAIT");
  });
});
