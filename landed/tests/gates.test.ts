import { describe, expect, it } from "vitest";
import { isFulfilEligible, type EligibilityEvidence } from "../lib/eligibility";
import { guardMargin, routeOrder, type RoutableOffer } from "../lib/routing";
import { listingGuard, channelPriceFor, channelNetCents } from "../lib/channels/guard";
import { lintClaims, cheapestClaim } from "../lib/claims";
import { restrictedReason } from "../lib/restricted";
import { freshnessTier, isDue } from "../lib/freshness";
import { affiliateUrl, isSafeRedirect } from "../lib/affiliate";

const good: EligibilityEvidence = {
  watches14d: 8,
  clicks14d: 3,
  fulfilMatchConfidence: 0.95,
  hasFulfilSupplier: true,
  liveMarginPct: 0.12,
  beatsBuyerRouteByCents: 1500,
  restricted: false,
  priceAgeHours: 4,
};

describe("isFulfilEligible", () => {
  it("passes with demand, verified match, a supplier, margin and a fresh price", () => {
    expect(isFulfilEligible(good)).toEqual({ ok: true, missing: [] });
  });
  it("either watches or clicks can prove demand", () => {
    expect(isFulfilEligible({ ...good, watches14d: 0, clicks14d: 25 }).ok).toBe(true);
    expect(isFulfilEligible({ ...good, watches14d: 1, clicks14d: 2 }).ok).toBe(false);
  });
  it("a heuristic-only match (capped at 0.70) cannot pass", () => {
    const r = isFulfilEligible({ ...good, fulfilMatchConfidence: 0.7 });
    expect(r.ok).toBe(false);
    expect(r.missing.join()).toMatch(/match not verified/);
  });
  it("restricted goods never pass, and every gap is listed", () => {
    const r = isFulfilEligible({
      ...good,
      restricted: true,
      restrictedReason: "vape",
      hasFulfilSupplier: false,
      liveMarginPct: 0.01,
      priceAgeHours: null,
    });
    expect(r.ok).toBe(false);
    expect(r.missing.length).toBe(4);
  });
  it("not cheaper than the buyer's own route fails", () => {
    expect(isFulfilEligible({ ...good, beatsBuyerRouteByCents: -1 }).ok).toBe(false);
  });
});

const offer = (o: Partial<RoutableOffer>): RoutableOffer => ({
  offerId: 1,
  supplierMode: "MANUAL_ASSISTED",
  costCents: 10000,
  inStock: true,
  matchConfidence: 0.95,
  supplierReliability: 0.95,
  ...o,
});

describe("routeOrder", () => {
  it("never routes to affiliate-only, out-of-stock or unverified sources", () => {
    const d = routeOrder([
      offer({ offerId: 1, supplierMode: "AFFILIATE_ONLY", costCents: 1 }),
      offer({ offerId: 2, inStock: false, costCents: 2 }),
      offer({ offerId: 3, matchConfidence: 0.7, costCents: 3 }),
      offer({ offerId: 4, costCents: 12000 }),
    ]);
    expect(d.chosen?.offerId).toBe(4);
    expect(d.fallbacks).toHaveLength(0);
  });
  it("never routes a single order to a wholesale MOQ source", () => {
    const d = routeOrder([offer({ offerId: 1, costCents: 5000, moqForced: true }), offer({ offerId: 2, costCents: 9000 })]);
    expect(d.chosen?.offerId).toBe(2);
    expect(routeOrder([offer({ moqForced: true })]).reason).toMatch(/MOQ/);
  });
  it("prices in seller reliability", () => {
    const d = routeOrder([
      offer({ offerId: 1, costCents: 10000, supplierReliability: 0.6 }),
      offer({ offerId: 2, costCents: 11000, supplierReliability: 0.98 }),
    ]);
    expect(d.chosen?.offerId).toBe(2);
    expect(d.fallbacks.map((f) => f.offerId)).toEqual([1]);
  });
  it("prefers an API supplier within 2%", () => {
    const d = routeOrder([
      offer({ offerId: 1, costCents: 10000 }),
      offer({ offerId: 2, costCents: 10150, supplierMode: "API" }),
    ]);
    expect(d.chosen?.offerId).toBe(2);
  });
  it("returns null with a reason when nothing is orderable", () => {
    const d = routeOrder([offer({ inStock: false })]);
    expect(d.chosen).toBeNull();
    expect(d.reason).toMatch(/out of stock/);
  });
});

describe("guardMargin", () => {
  const base = { priceCents: 15000, lockedCostCents: 10000, checkoutFeeCents: 745, floorPct: 0.08 };
  it("proceeds when cost fell", () => {
    expect(guardMargin({ ...base, liveCostCents: 9500 }).action).toBe("PROCEED");
  });
  it("absorbs small drift above the floor", () => {
    expect(guardMargin({ ...base, liveCostCents: 11000 }).action).toBe("PROCEED_ABSORB");
  });
  it("sends margin-eating drift to a human", () => {
    const g = guardMargin({ ...base, liveCostCents: 13500 });
    expect(g.action).toBe("NEEDS_DECISION");
    expect(g.liveMarginPct).toBeLessThan(0.08);
  });
});

describe("listingGuard", () => {
  const fees = { commissionPct: 0.13, paymentFeePct: 0, fixedFeeHkdCents: 300 };
  it("keeps a listing above the floor", () => {
    expect(listingGuard({ listedPriceCents: 20000, liveCostCents: 12000, inStock: true, fees, marginFloorPct: 0.08, maxRepricePct: 0.15 }).verdict).toBe("KEEP");
  });
  it("reprices a modest cost rise to hold the floor", () => {
    const v = listingGuard({ listedPriceCents: 20000, liveCostCents: 16000, inStock: true, fees, marginFloorPct: 0.08, maxRepricePct: 0.15 });
    expect(v.verdict).toBe("REPRICE");
    if (v.verdict === "REPRICE") {
      expect(channelNetCents(v.newPriceCents, 16000, fees) / v.newPriceCents).toBeGreaterThanOrEqual(0.08);
    }
  });
  it("delists on a price spike or stock-out", () => {
    expect(listingGuard({ listedPriceCents: 20000, liveCostCents: 30000, inStock: true, fees, marginFloorPct: 0.08, maxRepricePct: 0.15 }).verdict).toBe("DELIST");
    expect(listingGuard({ listedPriceCents: 20000, liveCostCents: 10000, inStock: false, fees, marginFloorPct: 0.08, maxRepricePct: 0.15 }).verdict).toBe("DELIST");
    expect(listingGuard({ listedPriceCents: 20000, liveCostCents: null, inStock: true, fees, marginFloorPct: 0.08, maxRepricePct: 0.15 }).verdict).toBe("DELIST");
  });
  it("channelPriceFor clears the floor", () => {
    const p = channelPriceFor(10000, fees, 0.1);
    expect(channelNetCents(p, 10000, fees) / p).toBeGreaterThanOrEqual(0.1);
  });
});

describe("claims lint", () => {
  it("blocks unsubstantiated cheapest claims in English and Chinese", () => {
    expect(lintClaims("The cheapest in the world!")[0].rule).toBe("UNSUBSTANTIATED_CHEAPEST");
    expect(lintClaims("全港最平 小米手環")[0].rule).toBe("UNSUBSTANTIATED_CHEAPEST");
  });
  it("blocks fake scarcity unless it is live pool data", () => {
    expect(lintClaims("Only 3 left!").map((i) => i.rule)).toContain("FAKE_SCARCITY");
    expect(lintClaims("最後 3 件", { allowScarcity: true })).toEqual([]);
  });
  it("blocks authenticity and medical claims", () => {
    expect(lintClaims("100% authentic").map((i) => i.rule)).toContain("AUTHENTICITY_CLAIM");
    expect(lintClaims("根治失眠").map((i) => i.rule)).toContain("MEDICAL_CLAIM");
  });
  it("the generated claim itself passes", () => {
    expect(lintClaims(cheapestClaim(5, new Date("2026-09-15T02:30:00Z")))).toEqual([]);
    expect(cheapestClaim(5, new Date("2026-09-15T02:30:00Z"))).toContain("10:30");
  });
});

describe("restrictedReason", () => {
  it("catches banned and dangerous goods", () => {
    expect(restrictedReason("RELX 電子煙 pod system")).toMatch(/E-cigarettes/);
    expect(restrictedReason("Anker Power Bank 20000mAh")).toMatch(/Batteries/);
    expect(restrictedReason("AAA replica watch")).toMatch(/Counterfeit/);
  });
  it("leaves ordinary products alone", () => {
    expect(restrictedReason("Xiaomi Smart Band 9 NFC")).toBeNull();
    expect(restrictedReason("Midea Electric Kettle 1.5L")).toBeNull();
  });
});

describe("freshness", () => {
  it("money-bearing products are HOT", () => {
    expect(freshnessTier({ liveListings: 1, openPools: 0, openOrders: 0, activeWatches: 0, searchedWithinDays: null })).toBe("HOT");
    expect(freshnessTier({ liveListings: 0, openPools: 0, openOrders: 0, activeWatches: 2, searchedWithinDays: null })).toBe("WARM");
    expect(freshnessTier({ liveListings: 0, openPools: 0, openOrders: 0, activeWatches: 0, searchedWithinDays: 30 })).toBe("COLD");
  });
  it("isDue respects the tier window", () => {
    const now = new Date("2026-09-15T12:00:00Z");
    expect(isDue(null, "COLD", now)).toBe(true);
    expect(isDue(new Date("2026-09-15T07:00:00Z"), "HOT", now)).toBe(false);
    expect(isDue(new Date("2026-09-15T05:00:00Z"), "HOT", now)).toBe(true);
  });
});

describe("affiliate", () => {
  it("tags Amazon and eBay links only when a programme id exists", () => {
    expect(affiliateUrl("AMAZON", "https://www.amazon.com/dp/X", {}).tracked).toBe(false);
    const a = affiliateUrl("AMAZON", "https://www.amazon.com/dp/X", { AMAZON_ASSOCIATE_TAG: "landed-20" });
    expect(a.tracked).toBe(true);
    expect(a.url).toContain("tag=landed-20");
    expect(affiliateUrl("EBAY", "https://www.ebay.com/itm/1", { EBAY_EPN_CAMPAIGN_ID: "123" }).url).toContain("campid=123");
  });
  it("AliExpress stays untracked without the Portals API", () => {
    expect(affiliateUrl("ALIEXPRESS", "https://www.aliexpress.com/item/1.html", { ALIEXPRESS_TRACKING_ID: "x" }).tracked).toBe(false);
  });
  it("refuses open redirects", () => {
    expect(isSafeRedirect("https://www.amazon.com/dp/X")).toBe(true);
    expect(isSafeRedirect("https://item.taobao.com/item.htm?id=1")).toBe(true);
    expect(isSafeRedirect("https://evil.example/amazon.com")).toBe(false);
    expect(isSafeRedirect("javascript:alert(1)")).toBe(false);
    expect(isSafeRedirect("https://amazon.com.evil.io/")).toBe(false);
    expect(isSafeRedirect("https://www.ebay.co.uk.attacker.net/")).toBe(false);
    expect(isSafeRedirect("https://www.amazon.co.uk/dp/X")).toBe(true);
  });
});
