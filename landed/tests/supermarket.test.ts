import { describe, expect, it } from "vitest";
import { bestDeal, costFor, parsePromo } from "../lib/supermarket/promo";
import { compareBasket, type RetailerPrice } from "../lib/supermarket/basket";
import { normalizeOpw } from "../lib/supermarket/opw";

describe("parsePromo — every pattern seen in the live feed", () => {
  const cases: [string, string][] = [
    ["2 for $14.00", "BUNDLE"],
    ["2 For $45.00", "BUNDLE"],
    ["Buy 3 at $14.90", "BUNDLE"],
    ["Buy 2 item(s) for $38.00", "BUNDLE"],
    ["Buy 2 For $59.90", "BUNDLE"],
    ["Buy 2 to save $4.00", "SAVE"],
    ["Buy 2 get 1 free", "FREE"],
    ["Buy 1 Get 1 Free", "FREE"],
    ["Buy 2nd at half price", "NTH_PCT"],
    ["2nd Item For 50% off", "NTH_PCT"],
    ["2nd 50% Off", "NTH_PCT"],
    ["Buy Second for $1.00", "NTH_PRICE"],
    ["Buy 2 save 10%", "GROUP_PCT"],
    ["Buy 2 to get 10% off", "GROUP_PCT"],
    ["2 Or More 10%Off", "MIN_PCT"],
    ["6 RED WHITE WINE SAVE 15%", "MIN_PCT"],
    ["10.00% OFF", "PCT"],
    ["30%off", "PCT"],
    ["15% off", "PCT"],
  ];
  for (const [text, kind] of cases) {
    it(text, () => expect(parsePromo(text).map((r) => r.kind)).toEqual([kind]));
  }
  it("parses both halves of a compound promotion", () => {
    expect(parsePromo("2 for $130.00 / 6 RED WHITE WINE SAVE 15%").map((r) => r.kind)).toEqual(["BUNDLE", "MIN_PCT"]);
  });
  it("leaves free-form text unpriced rather than guessing", () => {
    expect(parsePromo("Purchase 2 pcs of Java Sea, enjoy 8% off, 3 pcs enjoy 15% off.")).toEqual([]);
  });
});

describe("costFor", () => {
  it("bundles apply to full groups only", () => {
    const r = parsePromo("2 for $14.00");
    expect(costFor(1000, r, 1)).toBe(1000);
    expect(costFor(1000, r, 2)).toBe(1400);
    expect(costFor(1000, r, 3)).toBe(2400);
  });
  it("buy-N-get-M-free charges only what you must buy", () => {
    const r = parsePromo("Buy 2 get 1 free");
    expect(costFor(1000, r, 3)).toBe(2000);
    expect(costFor(1000, r, 4)).toBe(3000);
    expect(costFor(1000, r, 5)).toBe(4000);
    expect(costFor(1000, r, 6)).toBe(4000);
  });
  it("second-at-half-price and min-quantity discounts", () => {
    expect(costFor(1000, parsePromo("Buy 2nd at half price"), 2)).toBe(1500);
    expect(costFor(1000, parsePromo("2 Or More 10%Off"), 1)).toBe(1000);
    expect(costFor(1000, parsePromo("2 Or More 10%Off"), 3)).toBe(2700);
  });
  it("never stacks promotions and ignores a 'deal' dearer than shelf", () => {
    const r = [...parsePromo("2 for $14.00"), ...parsePromo("10% OFF")];
    expect(costFor(1000, r, 2)).toBe(1400); // best single rule, not both
    expect(costFor(500, parsePromo("2 for $14.00"), 2)).toBe(1000);
  });
  it("bestDeal names the smallest quantity at the lowest unit price", () => {
    expect(bestDeal(1000, parsePromo("2 for $14.00"))).toEqual({ qty: 2, unitCents: 700, totalCents: 1400 });
    expect(bestDeal(1000, [])).toBeNull();
  });
});

describe("compareBasket", () => {
  const p = (productId: number, retailer: string, shelfCents: number, promo = "", inStock = true): RetailerPrice => ({
    productId,
    retailer,
    shelfCents,
    rules: parsePromo(promo),
    inStock,
  });
  const lines = [
    { productId: 1, title: "milk", qty: 2 },
    { productId: 2, title: "noodles", qty: 1 },
  ];
  const prices = [
    p(1, "WELLCOME", 1000, "2 for $14.00"),
    p(1, "PARKNSHOP", 800),
    p(2, "WELLCOME", 500),
    p(2, "PARKNSHOP", 700),
    p(2, "AEON", 300),
  ];

  it("promotions change which single shop wins", () => {
    const c = compareBasket(lines, prices);
    // Wellcome: 1400 + 500 = 1900; PARKnSHOP: 1600 + 700 = 2300; AEON lacks milk.
    expect(c.bestSingle?.retailer).toBe("WELLCOME");
    expect(c.bestSingle?.totalCents).toBe(1900);
    expect(c.bestSingle?.promoSavingCents).toBe(600);
  });

  it("split plan picks the cheapest shop per line and reports the saving", () => {
    const c = compareBasket(lines, prices);
    expect(c.split.totalCents).toBe(1700); // Wellcome milk 1400 + AEON noodles 300
    expect(c.split.stores.sort()).toEqual(["AEON", "WELLCOME"]);
    expect(c.splitSavesCents).toBe(200);
  });

  it("delivery fees can erase the split saving", () => {
    const c = compareBasket(lines, prices, {
      includeDelivery: true,
      deliveryRules: [
        { retailer: "WELLCOME", feeCents: 3000, freeOverCents: 1500 },
        { retailer: "AEON", feeCents: 3000, freeOverCents: 50000 },
      ],
    });
    expect(c.bestSingle?.deliveryCents).toBe(0);
    expect(c.split.deliveryCents).toBe(6000);
    expect(c.splitSavesCents).toBe(0);
  });

  it("out-of-stock lines count as missing, and no complete shop means no single winner", () => {
    const c = compareBasket(lines, [p(1, "WELLCOME", 1000), p(2, "WELLCOME", 500, "", false), p(2, "AEON", 300)]);
    expect(c.bestSingle).toBeNull();
    expect(c.stores.find((s) => s.retailer === "WELLCOME")!.missing.map((m) => m.productId)).toEqual([2]);
    expect(c.split.unavailable).toEqual([]);
  });
});

describe("normalizeOpw", () => {
  it("normalizes a real feed record and drops unknown retailers and bad prices", () => {
    const { items, unknownRetailers } = normalizeOpw([
      {
        code: "P000003270",
        brand: { en: "Garden", "zh-Hant": "嘉頓" },
        name: { en: "Mini Swiss Roll - Chocolate 56g", "zh-Hant": "迷你瑞士卷 - 朱古力 56克" },
        cat1Name: { en: "Bakery", "zh-Hant": "麵包蛋糕" },
        cat2Name: { en: "Cakes", "zh-Hant": "蛋糕" },
        prices: [
          { supermarketCode: "WELLCOME", price: "11.00" },
          { supermarketCode: "AEON", price: "6.90" },
          { supermarketCode: "NEWCHAIN", price: "5.00" },
          { supermarketCode: "PARKNSHOP", price: "0" },
        ],
        offers: [{ supermarketCode: "WELLCOME", en: "2 for $17.00", "zh-Hant": "買2件$17.00" }],
      },
      { code: "bad code!", prices: [] },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].titleZh).toBe("嘉頓 迷你瑞士卷 - 朱古力 56克");
    expect(items[0].prices.map((p) => p.retailer)).toEqual(["WELLCOME", "AEON"]);
    expect(items[0].promos[0].rules[0]).toEqual({ kind: "BUNDLE", qty: 2, totalCents: 1700 });
    expect(unknownRetailers).toEqual(["NEWCHAIN"]);
  });
  it("accepts numeric codes seen in the live feed", () => {
    const { items } = normalizeOpw([{ code: 12345 as unknown as string, name: { en: "X" }, prices: [{ supermarketCode: "AEON", price: "1.00" }] }]);
    expect(items[0].code).toBe("12345");
  });
  it("rejects a feed that is not an array", () => {
    expect(() => normalizeOpw({ error: "down" })).toThrow();
  });
});
