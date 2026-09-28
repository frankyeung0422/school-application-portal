import { describe, expect, it } from "vitest";
import { landedQuote, type SourceProfile } from "../lib/money/landed";

const mids = { USD: 7.8, CNY: 1.08 };

const aliexpress: SourceProfile = {
  platform: "ALIEXPRESS",
  currency: "USD",
  shipToHkHkd: 15,
  freeShipOverNative: 10,
  domesticShipNative: 0,
  viaForwarder: false,
  forwarderPerKgHkd: 0,
  forwarderMinHkd: 0,
  assumedWeightKg: 0.3,
  cardFxMarkupPct: 0.02,
  paymentFeePct: 0,
  importDutyPct: 0,
};

const taobao: SourceProfile = {
  platform: "TAOBAO",
  currency: "CNY",
  shipToHkHkd: 0,
  freeShipOverNative: null,
  domesticShipNative: 8,
  viaForwarder: true,
  forwarderPerKgHkd: 20,
  forwarderMinHkd: 18,
  assumedWeightKg: 0.5,
  cardFxMarkupPct: 0.02,
  paymentFeePct: 0,
  importDutyPct: 0,
};

const rail = { name: "AIRWALLEX", bps: 50, minFeeHkdCents: 0 };

describe("landedQuote", () => {
  it("applies free shipping over the threshold and card FX markup", () => {
    const q = landedQuote({ price: 26.5, currency: "USD", qty: 1, profile: aliexpress, mids, payWith: { kind: "CARD" } });
    // 26.5 × 7.8 = 206.70 goods; free shipping; 2% FX = 4.13
    expect(q.breakdown.find((l) => l.key === "ITEMS")!.hkdCents).toBe(20670);
    expect(q.breakdown.find((l) => l.key === "SOURCE_SHIPPING")!.hkdCents).toBe(0);
    expect(q.breakdown.find((l) => l.key === "FX_COST")!.hkdCents).toBe(413);
    expect(q.totalHkdCents).toBe(21083);
    expect(q.perUnitHkdCents).toBe(21083);
  });

  it("charges seller shipping below the free-shipping threshold", () => {
    const q = landedQuote({ price: 5, currency: "USD", qty: 1, profile: aliexpress, mids, payWith: { kind: "CARD" } });
    expect(q.breakdown.find((l) => l.key === "SOURCE_SHIPPING")!.hkdCents).toBe(1500);
  });

  it("adds the domestic leg and per-kg forwarding for CN-only platforms", () => {
    const q = landedQuote({ price: 239, currency: "CNY", qty: 1, profile: taobao, mids, payWith: { kind: "CARD" } });
    const byKey = Object.fromEntries(q.breakdown.map((l) => [l.key, l.hkdCents]));
    expect(byKey.ITEMS).toBe(25812); // 239 × 1.08
    expect(byKey.DOMESTIC_LEG).toBe(864); // 8 × 1.08
    expect(byKey.FORWARDER).toBe(1800); // max(18, 20 × 0.5kg = 10)
    expect(q.assumptions.some((a) => a.includes("weight"))).toBe(true);
  });

  it("uses stated weight instead of the assumption", () => {
    const q = landedQuote({ price: 239, currency: "CNY", qty: 1, weightKg: 2, profile: taobao, mids, payWith: { kind: "CARD" } });
    expect(q.breakdown.find((l) => l.key === "FORWARDER")!.hkdCents).toBe(4000);
    expect(q.assumptions.some((a) => a.includes("weight"))).toBe(false);
  });

  it("a settlement rail costs less than a card on the same goods", () => {
    const card = landedQuote({ price: 100, currency: "USD", qty: 1, profile: aliexpress, mids, payWith: { kind: "CARD" } });
    const viaRail = landedQuote({ price: 100, currency: "USD", qty: 1, profile: aliexpress, mids, payWith: { kind: "RAIL", rail } });
    expect(viaRail.totalHkdCents).toBeLessThan(card.totalHkdCents);
    expect(viaRail.breakdown.find((l) => l.key === "FX_COST")!.hkdCents).toBe(390); // 0.5% of 780
  });

  it("HKD sources carry no FX cost", () => {
    const q = landedQuote({ price: 100, currency: "HKD", qty: 1, profile: { ...aliexpress, currency: "HKD" }, mids, payWith: { kind: "CARD" } });
    expect(q.breakdown.some((l) => l.key === "FX_COST")).toBe(false);
  });

  it("MOQ forces a larger purchase and says so", () => {
    const q = landedQuote({
      price: 145,
      currency: "CNY",
      qty: 1,
      moq: 2,
      priceTiers: [{ minQty: 2, price: 145 }, { minQty: 10, price: 138 }],
      profile: taobao,
      mids,
      payWith: { kind: "CARD" },
    });
    expect(q.moqForced).toBe(true);
    expect(q.listingsBought).toBe(2);
    expect(q.unitsReceived).toBe(2);
  });

  it("uses the wholesale tier for the quantity bought", () => {
    const q = landedQuote({
      price: 145,
      currency: "CNY",
      qty: 10,
      priceTiers: [{ minQty: 2, price: 145 }, { minQty: 10, price: 138 }],
      profile: taobao,
      mids,
      payWith: { kind: "CARD" },
    });
    expect(q.unitListingPriceNative).toBe(138);
  });

  it("normalises multi-packs to per-unit cost", () => {
    const q = landedQuote({ price: 20, currency: "USD", qty: 4, packQty: 4, profile: aliexpress, mids, payWith: { kind: "CARD" } });
    expect(q.listingsBought).toBe(1);
    expect(q.unitsReceived).toBe(4);
    expect(q.perUnitHkdCents).toBe(Math.round(q.totalHkdCents / 4));
  });

  it("rejects nonsense input", () => {
    expect(() => landedQuote({ price: 0, currency: "USD", qty: 1, profile: aliexpress, mids, payWith: { kind: "CARD" } })).toThrow();
    expect(() => landedQuote({ price: 1, currency: "XYZ", qty: 1, profile: aliexpress, mids, payWith: { kind: "CARD" } })).toThrow(/No FX/);
  });
});
