import { describe, expect, it } from "vitest";
import { computeMargin, tierPriceAt, type FeeParams } from "../lib/money/margin";

const ZERO_FEES: FeeParams = {
  commissionPct: 0,
  paymentFeePct: 0,
  shipDomesticCny: 0,
  shipCrossBorderCnyPerKg: 0,
  assumedWeightKg: 0.5,
  otherPct: 0,
};

describe("tierPriceAt", () => {
  const tiers = [
    { minQty: 2, price: 145 },
    { minQty: 10, price: 138 },
    { minQty: 50, price: 129 },
  ];
  it("picks the highest eligible tier", () => {
    expect(tierPriceAt(tiers, 2, 999)).toBe(145);
    expect(tierPriceAt(tiers, 10, 999)).toBe(138);
    expect(tierPriceAt(tiers, 49, 999)).toBe(138);
    expect(tierPriceAt(tiers, 500, 999)).toBe(129);
  });
  it("falls back when qty below all tiers or no tiers", () => {
    expect(tierPriceAt(tiers, 1, 150)).toBe(150);
    expect(tierPriceAt(null, 5, 150)).toBe(150);
    expect(tierPriceAt([], 5, 150)).toBe(150);
  });
});

describe("computeMargin", () => {
  it("computes zero-fee margin as plain spread", () => {
    const m = computeMargin({
      buyPriceCny: 100,
      sellPriceCny: 250,
      buyFees: ZERO_FEES,
      sellFees: ZERO_FEES,
      crossBorder: false,
    });
    expect(m.grossSpreadCny).toBe(150);
    expect(m.netMarginCny).toBe(150);
    expect(m.netMarginPct).toBeCloseTo(0.6);
    expect(m.moqUnits).toBeNull();
    expect(m.capitalRequiredCny).toBeNull();
  });

  it("applies sell-side fees and both shipping legs (hand-checked)", () => {
    // 1688 buy @145, JD sell @249:
    // sell fees: commission 6% = 14.94, payment 0.6% = 1.494, other 2% = 4.98
    // inbound ship 10, outbound ship 8
    // net = 249 − 14.94 − 1.494 − 4.98 − 145 − 10 − 8 = 64.586
    const m = computeMargin({
      buyPriceCny: 145,
      sellPriceCny: 249,
      buyFees: { ...ZERO_FEES, shipDomesticCny: 10 },
      sellFees: {
        ...ZERO_FEES,
        commissionPct: 0.06,
        paymentFeePct: 0.006,
        otherPct: 0.02,
        shipDomesticCny: 8,
      },
      crossBorder: false,
    });
    expect(m.netMarginCny).toBeCloseTo(64.586, 3);
    expect(m.netMarginPct).toBeCloseTo(64.586 / 249, 4);
    expect(m.grossSpreadCny).toBe(104);
  });

  it("uses cross-border per-kg shipping when selling overseas", () => {
    // sell 360 CNY (=$50 @7.2) on Amazon: commission 15% = 54,
    // cross-border 60/kg × 0.5kg = 30, buy 145 + inbound 10
    // net = 360 − 54 − 30 − 145 − 10 = 121
    const m = computeMargin({
      buyPriceCny: 145,
      sellPriceCny: 360,
      buyFees: { ...ZERO_FEES, shipDomesticCny: 10 },
      sellFees: {
        ...ZERO_FEES,
        commissionPct: 0.15,
        shipCrossBorderCnyPerKg: 60,
        assumedWeightKg: 0.5,
      },
      crossBorder: true,
    });
    expect(m.netMarginCny).toBeCloseTo(121, 3);
  });

  it("uses MOQ tier price and reports capital requirement", () => {
    const m = computeMargin({
      buyPriceCny: 160, // display price, should be overridden by tier
      sellPriceCny: 249,
      buyFees: ZERO_FEES,
      sellFees: ZERO_FEES,
      crossBorder: false,
      moq: 10,
      priceTiers: [
        { minQty: 2, price: 145 },
        { minQty: 10, price: 138 },
      ],
    });
    expect(m.buyPriceCny).toBe(138);
    expect(m.moqUnits).toBe(10);
    expect(m.capitalRequiredCny).toBe(1380);
    expect(m.grossSpreadCny).toBe(111);
  });

  it("normalizes both sides to per-unit prices before comparing", () => {
    // 6-pack sourced at ¥60 vs a single unit selling at ¥25: the real spread is
    // ¥10/unit vs ¥25/unit, not ¥60 vs ¥25.
    const m = computeMargin({
      buyPriceCny: 60,
      sellPriceCny: 25,
      buyPackQty: 6,
      sellPackQty: 1,
      buyFees: ZERO_FEES,
      sellFees: ZERO_FEES,
      crossBorder: false,
    });
    expect(m.buyPriceCny).toBeCloseTo(10);
    expect(m.sellPriceCny).toBe(25);
    expect(m.netMarginCny).toBeCloseTo(15);
    expect(m.roiPct).toBeCloseTo(1.5);
  });

  it("import duty can turn a paper profit into a loss", () => {
    // ¥145 sourced in CN, sold at ¥360 on Amazon. Without duty this is the
    // +¥121 case above; with 30% duty, FBA, returns and ads it is not.
    const m = computeMargin({
      buyPriceCny: 145,
      sellPriceCny: 360,
      buyFees: { ...ZERO_FEES, shipDomesticCny: 10, importDutyPct: 0.3 },
      sellFees: {
        ...ZERO_FEES,
        commissionPct: 0.15,
        shipCrossBorderCnyPerKg: 60,
        assumedWeightKg: 0.5,
        fulfilmentFeeCny: 32,
        returnsRatePct: 0.05,
        adSpendPct: 0.08,
      },
      crossBorder: true,
    });
    // landed = (145 + 10) × 1.30 = 201.5
    expect(m.landedCostCny).toBeCloseTo(201.5, 6);
    // net = 360 − 54 − 18 − 28.8 − 32 − 30 − 201.5 = −4.3
    expect(m.netMarginCny).toBeCloseTo(-4.3, 6);
    expect(m.netMarginCny).toBeLessThan(0);
  });

  it("charges no import duty on a domestic lane", () => {
    const domestic = computeMargin({
      buyPriceCny: 145,
      sellPriceCny: 249,
      buyFees: { ...ZERO_FEES, shipDomesticCny: 10, importDutyPct: 0.3 },
      sellFees: { ...ZERO_FEES, shipDomesticCny: 8 },
      crossBorder: false,
    });
    expect(domestic.landedCostCny).toBeCloseTo(155);
    expect(domestic.feeBreakdown.some((l) => l.label === "Import duty")).toBe(false);
  });

  it("break-even sell price covers fixed costs after percentage fees", () => {
    const m = computeMargin({
      buyPriceCny: 100,
      sellPriceCny: 200,
      buyFees: ZERO_FEES,
      sellFees: { ...ZERO_FEES, commissionPct: 0.15, adSpendPct: 0.05 },
      crossBorder: false,
    });
    expect(m.breakEvenSellPriceCny).toBeCloseTo(100 / 0.8, 6);
    // A sale at exactly break-even yields zero margin.
    const atBreakEven = computeMargin({
      buyPriceCny: 100,
      sellPriceCny: m.breakEvenSellPriceCny,
      buyFees: ZERO_FEES,
      sellFees: { ...ZERO_FEES, commissionPct: 0.15, adSpendPct: 0.05 },
      crossBorder: false,
    });
    expect(atBreakEven.netMarginCny).toBeCloseTo(0, 6);
  });

  it("category referral fee overrides the platform default", () => {
    const fees: FeeParams = {
      ...ZERO_FEES,
      commissionPct: 0.15,
      categoryFees: { "Consumer Electronics": 0.08 },
    };
    const generic = computeMargin({
      buyPriceCny: 100,
      sellPriceCny: 200,
      buyFees: ZERO_FEES,
      sellFees: fees,
      crossBorder: false,
    });
    const electronics = computeMargin({
      buyPriceCny: 100,
      sellPriceCny: 200,
      buyFees: ZERO_FEES,
      sellFees: fees,
      crossBorder: false,
      category: "Consumer Electronics",
    });
    expect(generic.netMarginCny).toBeCloseTo(70);
    expect(electronics.netMarginCny).toBeCloseTo(84);
  });

  it("fee breakdown line items sum to the net margin", () => {
    const m = computeMargin({
      buyPriceCny: 145,
      sellPriceCny: 249,
      buyFees: { ...ZERO_FEES, shipDomesticCny: 10 },
      sellFees: {
        ...ZERO_FEES,
        commissionPct: 0.06,
        paymentFeePct: 0.006,
        otherPct: 0.02,
        shipDomesticCny: 8,
      },
      crossBorder: false,
    });
    const sum = m.feeBreakdown.reduce((acc, li) => acc + li.amountCny, 0);
    expect(sum).toBeCloseTo(m.netMarginCny, 6);
  });

  it("fee breakdown still sums with every landed-cost line present", () => {
    const m = computeMargin({
      buyPriceCny: 120,
      sellPriceCny: 400,
      buyPackQty: 2,
      buyFees: { ...ZERO_FEES, shipDomesticCny: 10, importDutyPct: 0.3 },
      sellFees: {
        ...ZERO_FEES,
        commissionPct: 0.15,
        paymentFeePct: 0.03,
        otherPct: 0.02,
        returnsRatePct: 0.05,
        adSpendPct: 0.08,
        fulfilmentFeeCny: 32,
        shipCrossBorderCnyPerKg: 60,
        assumedWeightKg: 0.4,
      },
      crossBorder: true,
      weightKg: 0.8,
    });
    const sum = m.feeBreakdown.reduce((acc, li) => acc + li.amountCny, 0);
    expect(sum).toBeCloseTo(m.netMarginCny, 6);
    // weightKg overrides the platform's assumed weight
    expect(m.feeBreakdown.find((l) => l.label === "Cross-border shipping")!.amountCny).toBeCloseTo(-48);
  });
});
