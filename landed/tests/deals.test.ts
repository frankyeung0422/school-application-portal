import { describe, expect, it } from "vitest";
import { crossChainDeal, dealStrength, historyDeal, promoCycleDeal, MIN_HISTORY_DAYS } from "../lib/deals/score";
import { lintClaims } from "../lib/claims";

const days = (n: number, price: (i: number) => number, start = "2026-06-01") =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(`${start}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return { day: d.toISOString().slice(0, 10), priceCents: price(i) };
  });

describe("historyDeal", () => {
  it("refuses to judge without enough history", () => {
    expect(historyDeal(days(MIN_HISTORY_DAYS - 1, () => 2000), 1000)).toBeNull();
    // Enough points, but squeezed into too short a span.
    expect(historyDeal(days(15, () => 2000).map((p, i) => ({ ...p, day: `2026-06-${String(1 + (i % 15)).padStart(2, "0")}` })), 1000)).toBeNull();
  });
  it("flags a real drop below the product's own median", () => {
    const r = historyDeal(days(60, () => 2000), 1500);
    expect(r?.kind).toBe("HISTORY_LOW");
    expect(r?.savingCents).toBe(500);
    expect(r?.text).toContain("期內最低");
  });
  it("ignores small drops and rounding-sized savings", () => {
    expect(historyDeal(days(60, () => 2000), 1800)).toBeNull(); // 10%
    expect(historyDeal(days(60, () => 1000), 800)).toBeNull(); // 20% but only HK$2
  });
});

describe("crossChainDeal", () => {
  it("needs at least three chains agreeing", () => {
    expect(crossChainDeal({ cheapestCents: 1000, medianCents: 2000, chains: 2, cheapestChain: "惠康" })).toBeNull();
    const r = crossChainDeal({ cheapestCents: 1000, medianCents: 2000, chains: 4, cheapestChain: "惠康" });
    expect(r?.pct).toBeCloseTo(0.5);
    expect(r?.text).toContain("惠康");
  });
  it("ignores gaps under 20%", () => {
    expect(crossChainDeal({ cheapestCents: 1700, medianCents: 2000, chains: 5, cheapestChain: "百佳" })).toBeNull();
  });
});

describe("promoCycleDeal", () => {
  const base = { cycles: 4, daysSinceLastPromo: 0, dueInDays: null, explanation: "" };
  it("only speaks when on offer now and offers are regular and infrequent", () => {
    expect(promoCycleDeal({ ...base, verdict: "REGULAR", medianGapDays: 28, onPromoNow: true })?.kind).toBe("PROMO_CYCLE");
    expect(promoCycleDeal({ ...base, verdict: "REGULAR", medianGapDays: 7, onPromoNow: true })).toBeNull();
    expect(promoCycleDeal({ ...base, verdict: "IRREGULAR", medianGapDays: 28, onPromoNow: true })).toBeNull();
    expect(promoCycleDeal({ ...base, verdict: "REGULAR", medianGapDays: 28, onPromoNow: false })).toBeNull();
  });
});

describe("deal wording", () => {
  it("passes the claims lint and ranks history above a one-day gap", () => {
    const h = historyDeal(days(60, () => 2000), 1500)!;
    const c = crossChainDeal({ cheapestCents: 1000, medianCents: 2000, chains: 4, cheapestChain: "惠康" })!;
    expect(lintClaims(h.text)).toEqual([]);
    expect(lintClaims(c.text)).toEqual([]);
    expect(dealStrength([h])).toBeGreaterThan(dealStrength([{ ...c, pct: 0.25 }]));
  });
});
