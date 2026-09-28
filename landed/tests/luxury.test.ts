import { describe, expect, it } from "vitest";
import { detectLuxury } from "../lib/luxury/brands";
import { incompatibleReason, isAccessoryTitle } from "../lib/match/attributes";
import { authenticityRisk, counterfeitCheck, genuineFloorCents } from "../lib/luxury/risk";
import { rankOffers, type RankableOffer } from "../lib/rank";

describe("detectLuxury", () => {
  it("recognises brands in English and Chinese", () => {
    expect(detectLuxury("Rolex Submariner 126610LN 41mm")).toEqual({ brand: "rolex", category: "WATCH" });
    expect(detectLuxury("勞力士 黑水鬼 126610LN")).toEqual({ brand: "rolex", category: "WATCH" });
    expect(detectLuxury("LOUIS VUITTON Neverfull MM Monogram")?.brand).toBe("louis vuitton");
    expect(detectLuxury("香奈兒 Classic Flap 中號")?.category).toBe("BAG");
  });
  it("prefers the longest brand match", () => {
    expect(detectLuxury("Tag Heuer Carrera")?.brand).toBe("tag heuer");
  });
  it("does not fire on ordinary goods or substrings", () => {
    expect(detectLuxury("Midea Electric Kettle 1.5L")).toBeNull();
    expect(detectLuxury("Corridor lamp 3-pack")).toBeNull();
    expect(detectLuxury("Xiaomi Smart Band 9")).toBeNull();
  });
});

describe("authenticityRisk", () => {
  const base = { category: "WATCH" as const, priceCents: 9_000_000, medianTrustedCents: 9_500_000, sellerRating: 4.9, reviewCount: 500 };
  it("wholesale/replica-heavy platforms are always high risk", () => {
    const r = authenticityRisk({ ...base, platform: "ALI1688" });
    expect(r.level).toBe("HIGH");
    expect(r.excludeFromBest).toBe(true);
  });
  it("a price far below the market median is high risk anywhere", () => {
    const r = authenticityRisk({ ...base, platform: "EBAY", priceCents: 3_000_000 });
    expect(r.level).toBe("HIGH");
    expect(r.reasons.join(" ")).toMatch(/median/);
  });
  it("a platform authentication programme lowers risk for covered categories", () => {
    expect(authenticityRisk({ ...base, platform: "EBAY" }).level).toBe("LOW");
    expect(authenticityRisk({ ...base, platform: "EBAY", category: "APPAREL" }).level).toBe("MEDIUM");
  });
  it("weak seller signals keep it at verify-first", () => {
    expect(authenticityRisk({ ...base, platform: "EBAY", sellerRating: 4.1 }).level).toBe("MEDIUM");
    expect(authenticityRisk({ ...base, platform: "EBAY", reviewCount: 3 }).level).toBe("MEDIUM");
  });
});

describe("ranking with counterfeit risk", () => {
  const offer = (o: Partial<RankableOffer>): RankableOffer => ({
    offerId: 1,
    landedPerUnitHkdCents: 9_000_000,
    matchConfidence: 1,
    supplierReliability: 0.95,
    inStock: true,
    isAccessory: false,
    ...o,
  });
  it("a high-risk luxury listing is shown but never called cheapest", () => {
    const { bestOfferId, ranked } = rankOffers([
      offer({ offerId: 1, landedPerUnitHkdCents: 3_000_000, highCounterfeitRisk: true }),
      offer({ offerId: 2, landedPerUnitHkdCents: 9_200_000 }),
    ]);
    expect(bestOfferId).toBe(2);
    expect(ranked.find((r) => r.offerId === 1)!.whyLow.join(" ")).toMatch(/counterfeit/i);
    expect(ranked).toHaveLength(2);
  });
});

describe("accessories are not luxury goods", () => {
  it("a branded strap, bezel or link is detected as an accessory first", () => {
    // detectLuxury still sees the brand; the catalogue must not treat it as luxury.
    expect(detectLuxury("Rubber Watch Band replacement for Omega Seamaster")).not.toBeNull();
    expect(isAccessoryTitle("Rubber Watch Band replacement for Omega Seamaster")).toBe(true);
    expect(isAccessoryTitle("Ceramic Bezel Insert For Rolex Submariner 126610")).toBe(true);
    expect(isAccessoryTitle("Rolex Submariner Date 126610LN 41mm")).toBe(false);
  });
});

describe("aftermarket goods sold 'for' a luxury item", () => {
  const cases = [
    "LckaeyFelt Organizer for Hermes Evelyne III bag Insert Mini",
    "Bag Organizer for Gucci GG Marmont Mini Matelasse Shoulder Bag",
    "ONEWatch Guard Full protection film for Rolex Watch Submariner",
    "Sapphire watch crystal for Rolex DATEJUST SUBMARINER 16233",
    "TOPBD For Omega Seamaster 300 Diving Watchbands Rubber Watch Band",
    "3 Pearl Ceramic Bezel Insert for Rolex Submariner 116610",
    "EwatchpartsSTAINLESS STEEL OYSTER LINK FOR 41MM ROLEX SUBMARINER WATCH 126610LN",
  ];
  for (const t of cases) it(`treats as accessory: ${t.slice(0, 40)}…`, () => expect(isAccessoryTitle(t)).toBe(true));
  it("still treats the real thing as a product", () => {
    expect(isAccessoryTitle("Tudor Black Bay 58 79030N Automatic 39mm")).toBe(false);
    expect(isAccessoryTitle("CHANEL Classic Flap Medium Caviar Gold Hardware")).toBe(false);
    expect(isAccessoryTitle("Jo Malone London Wood Sage & Sea Salt Cologne 100ml")).toBe(false);
  });
});

describe("sub-items are not the main product", () => {
  it("a Neverfull pochette never clusters with the Neverfull tote", () => {
    expect(
      incompatibleReason(
        { title: "Louis Vuitton Neverfull MM Monogram Canvas Tote Shoulder Bag" },
        { title: "Louis Vuitton Neverfull MM GM Pochette Monogram Pouch" },
      ),
    ).toMatch(/sub-item/);
  });
  it("two totes still compare", () => {
    expect(
      incompatibleReason(
        { title: "Louis Vuitton Neverfull MM Monogram Canvas Tote" },
        { title: "LOUIS VUITTON Neverfull MM Damier Ebene Tote Bag" },
      ),
    ).toBeNull();
  });
});

describe("counterfeit screening", () => {
  const evelyne = { brand: "hermes", category: "BAG" as const, title: "HERMES Evelyne 29 PM Shoulder Bag Crossbody Green" };
  it("removes a bag priced far below anything genuine", () => {
    const v = counterfeitCheck({ ...evelyne, priceHkdCents: 435_00 });
    expect(v.suspect).toBe(true);
    expect(v.reasons.join(" ")).toMatch(/genuine floor/);
  });
  it("keeps genuine pre-owned, which trades at 35–60% of retail", () => {
    // A used Neverfull around HK$5,000 is real and must survive.
    expect(counterfeitCheck({ brand: "louis vuitton", category: "BAG", title: "Louis Vuitton Neverfull MM Monogram Tote", priceHkdCents: 5_000_00 }).suspect).toBe(false);
    // A genuine pochette is small leather goods, judged on accessory floors.
    expect(counterfeitCheck({ brand: "louis vuitton", category: "ACCESSORY", title: "Louis Vuitton Neverfull Pochette Pouch", priceHkdCents: 1_999_00 }).suspect).toBe(false);
  });
  it("uses the brand's own HK price when we have it", () => {
    const official = 91_700_00;
    expect(counterfeitCheck({ brand: "rolex", category: "WATCH", title: "Rolex Submariner 126610LN", priceHkdCents: 25_000_00, officialHkCents: official }).suspect).toBe(true);
    // Grey-market and pre-owned above the fake ratio stay in the comparison.
    expect(counterfeitCheck({ brand: "rolex", category: "WATCH", title: "Rolex Submariner 126610LN", priceHkdCents: 75_000_00, officialHkCents: official }).suspect).toBe(false);
  });
  it("catches replica wording whatever the price", () => {
    expect(counterfeitCheck({ brand: "rolex", category: "WATCH", title: "Rolex Submariner 1:1 super clone AAA", priceHkdCents: 60_000_00 }).suspect).toBe(true);
    expect(counterfeitCheck({ brand: "chanel", category: "BAG", title: "香奈兒 高仿 Classic Flap", priceHkdCents: 30_000_00 }).reasons.join()).toMatch(/replica wording/);
  });
  it("floors know the difference between a Rolex and a Longines", () => {
    expect(genuineFloorCents("rolex", "WATCH")).toBeGreaterThan(genuineFloorCents("longines", "WATCH"));
    expect(genuineFloorCents("unknown-brand", "WATCH")).toBe(2_500_00);
  });
});
