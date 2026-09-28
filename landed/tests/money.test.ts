import { describe, expect, it } from "vitest";
import { customerRate, fxEconomics, realisedFxGainCents, settlementFeeCents } from "../lib/money/fx";
import { marginAt, storefrontPrice } from "../lib/money/pricing";

describe("fx", () => {
  it("quotes mid plus a disclosed buffer", () => {
    expect(customerRate(7.8, 0.015)).toBeCloseTo(7.917, 6);
    expect(() => customerRate(7.8, -0.01)).toThrow();
  });

  it("rail fee respects the minimum", () => {
    expect(settlementFeeCents(10000, { name: "W", bps: 50, minFeeHkdCents: 200 })).toBe(200);
    expect(settlementFeeCents(1000000, { name: "W", bps: 50, minFeeHkdCents: 200 })).toBe(5000);
    expect(settlementFeeCents(0, { name: "W", bps: 50, minFeeHkdCents: 200 })).toBe(0);
  });

  it("expected gain = buffer minus rail cost", () => {
    const e = fxEconomics({
      nativeAmount: 100,
      currency: "USD",
      mids: { USD: 7.8 },
      bufferPct: 0.015,
      rail: { name: "AIRWALLEX", bps: 50, minFeeHkdCents: 0 },
    });
    expect(e.midCostHkdCents).toBe(78000);
    expect(e.quotedHkdCents).toBe(79170);
    expect(e.railFeeHkdCents).toBe(390);
    expect(e.expectedGainHkdCents).toBe(780);
  });

  it("a card-priced rail can make the buffer a loss — and it is reported as one", () => {
    const e = fxEconomics({
      nativeAmount: 100,
      currency: "USD",
      mids: { USD: 7.8 },
      bufferPct: 0.015,
      rail: { name: "CARD_HK", bps: 250, minFeeHkdCents: 0 },
    });
    expect(e.expectedGainHkdCents).toBeLessThan(0);
  });

  it("realised gain is whatever actually left the account, even when negative", () => {
    expect(realisedFxGainCents(79170, 78500)).toBe(670);
    expect(realisedFxGainCents(79170, 80000)).toBe(-830);
  });
});

describe("storefrontPrice", () => {
  const fees = { pct: 0.034, fixedCents: 235 };

  it("prices in whole dollars and clears the target margin including checkout fees", () => {
    const p = storefrontPrice({ costCents: 20000, buyerRouteCents: 30000, targetMarginPct: 0.1, checkoutFees: fees });
    expect(p.priceCents % 100).toBe(0);
    expect(p.marginPct).toBeGreaterThanOrEqual(0.1);
    expect(p.viable).toBe(true);
    const check = marginAt(p.priceCents, 20000, fees);
    expect(check.marginCents).toBe(p.marginCents);
  });

  it("is not viable when the buyer can do better themselves", () => {
    const p = storefrontPrice({ costCents: 20000, buyerRouteCents: 21000, targetMarginPct: 0.1, checkoutFees: fees });
    expect(p.viable).toBe(false);
    expect(p.beatsBuyerRouteByCents).toBeLessThan(0);
    expect(p.reason).toMatch(/dearer/);
  });

  it("forgetting the processor fee would overstate margin", () => {
    const p = storefrontPrice({ costCents: 10000, buyerRouteCents: null, targetMarginPct: 0.08, checkoutFees: fees });
    const naiveMargin = p.priceCents - 10000;
    expect(p.marginCents).toBeLessThan(naiveMargin);
  });

  it("refuses impossible margin targets", () => {
    expect(() => storefrontPrice({ costCents: 100, buyerRouteCents: null, targetMarginPct: 0.97, checkoutFees: fees })).toThrow();
  });
});
