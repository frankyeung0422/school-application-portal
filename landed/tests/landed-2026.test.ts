import { describe, expect, it } from "vitest";
import { billableKg, landedQuote, type SourceProfile } from "../lib/money/landed";
import { DEFAULT_PREFS, parseDims, parsePrefs, payWithFor, serializePrefs } from "../lib/buyer-prefs";

const mids = { USD: 7.8, CNY: 1.08 };

// Taobao after 2025-08: official consolidation is free to an HK pickup point.
const taobao: SourceProfile = {
  platform: "TAOBAO",
  currency: "CNY",
  shipToHkHkd: 0,
  freeShipOverNative: null,
  domesticShipNative: 8,
  viaForwarder: true,
  forwarderPerKgHkd: 18,
  forwarderMinHkd: 18,
  assumedWeightKg: 0.5,
  cardFxMarkupPct: 0.0195,
  paymentFeePct: 0,
  importDutyPct: 0,
  officialFreeToPickup: true,
  officialFreeMaxKg: 3,
  homeDeliverySurchargeHkd: 20,
};
const oldTaobao: SourceProfile = { ...taobao, officialFreeToPickup: false, homeDeliverySurchargeHkd: 0 };
const card = { kind: "CARD" } as const;
const line = (q: ReturnType<typeof landedQuote>, key: string) => q.breakdown.find((l) => l.key === key)?.hkdCents ?? 0;

describe("Taobao official consolidation (2025-08 policy)", () => {
  it("a single item to a pickup point pays no domestic leg and no forwarder", () => {
    const q = landedQuote({ price: 50, currency: "CNY", qty: 1, profile: taobao, mids, payWith: card });
    expect(line(q, "DOMESTIC_LEG")).toBe(0);
    expect(line(q, "FORWARDER")).toBe(0);
    expect(q.assumptions.join(" ")).toContain("官方集運");
  });

  it("is cheaper than the pre-2025 forwarder model by the domestic leg + minimum forwarding", () => {
    const now = landedQuote({ price: 50, currency: "CNY", qty: 1, profile: taobao, mids, payWith: card });
    const before = landedQuote({ price: 50, currency: "CNY", qty: 1, profile: oldTaobao, mids, payWith: card });
    // ¥8 domestic (+ its card FX) + HK$18 minimum forwarding
    expect(before.totalHkdCents - now.totalHkdCents).toBe(Math.round(8 * 1.08 * 100) + Math.round(8 * 1.08 * 0.0195 * 100) + 1800);
  });

  it("door delivery adds the surcharge as its own line", () => {
    const q = landedQuote({ price: 50, currency: "CNY", qty: 1, profile: taobao, mids, payWith: card, delivery: "HOME" });
    expect(line(q, "DELIVERY")).toBe(2000);
    // Home delivery through the official route: still no private forwarder.
    expect(line(q, "FORWARDER")).toBeGreaterThan(0);
  });

  it("a parcel over the free cap falls back to the forwarder rate, and says why", () => {
    const q = landedQuote({ price: 50, currency: "CNY", qty: 1, weightKg: 4, profile: taobao, mids, payWith: card });
    expect(line(q, "FORWARDER")).toBe(18 * 4 * 100);
    expect(q.assumptions.join(" ")).toContain("超過官方免運上限");
  });
});

describe("volumetric weight", () => {
  it("bills the larger of actual and L×W×H/6000", () => {
    expect(billableKg(0.5, { l: 40, w: 30, h: 30 })).toBeCloseTo(6);
    expect(billableKg(8, { l: 10, w: 10, h: 10 })).toBe(8);
    expect(billableKg(0.5, null)).toBe(0.5);
  });

  it("a light but bulky item is no longer free and costs forwarding by volume", () => {
    const q = landedQuote({ price: 50, currency: "CNY", qty: 1, weightKg: 0.5, dimsCm: { l: 40, w: 30, h: 30 }, profile: taobao, mids, payWith: card });
    expect(line(q, "FORWARDER")).toBe(Math.round(18 * 6 * 100));
    expect(q.assumptions.join(" ")).toContain("體積重");
  });

  it("parses listing dimensions", () => {
    expect(parseDims("40 x 30 x 30 cm")).toEqual({ l: 40, w: 30, h: 30 });
    expect(parseDims("40×30*30")).toEqual({ l: 40, w: 30, h: 30 });
    expect(parseDims("large")).toBeNull();
  });
});

describe("paying with an e-wallet", () => {
  it("uses the wallet's spread instead of the card's 1.95%", () => {
    const viaCard = landedQuote({ price: 100, currency: "CNY", qty: 1, profile: taobao, mids, payWith: card });
    const viaWallet = landedQuote({ price: 100, currency: "CNY", qty: 1, profile: taobao, mids, payWith: { kind: "WALLET", wallet: "ALIPAYHK", fxMarkupPct: 0.005 } });
    expect(line(viaCard, "FX_COST")).toBe(Math.round(108 * 0.0195 * 100));
    expect(line(viaWallet, "FX_COST")).toBe(Math.round(108 * 0.005 * 100));
    expect(viaWallet.assumptions.join(" ")).toContain("AlipayHK");
  });

  it("a wallet only applies where the platform accepts it", () => {
    const prefs = { pay: "ALIPAYHK" as const, delivery: "PICKUP" as const };
    const m = { ALIPAYHK: 0.005, WECHATPAYHK: 0.006 };
    expect(payWithFor(prefs, "TAOBAO", m)).toEqual({ kind: "WALLET", wallet: "ALIPAYHK", fxMarkupPct: 0.005 });
    expect(payWithFor(prefs, "AMAZON", m)).toEqual({ kind: "CARD" });
    expect(payWithFor(DEFAULT_PREFS, "TAOBAO", m)).toEqual({ kind: "CARD" });
  });

  it("the preference cookie round-trips and rejects junk", () => {
    const p = { pay: "WECHATPAYHK" as const, delivery: "HOME" as const };
    expect(parsePrefs(serializePrefs(p))).toEqual(p);
    expect(parsePrefs("PAYME.MOON")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs(undefined)).toEqual(DEFAULT_PREFS);
  });
});
