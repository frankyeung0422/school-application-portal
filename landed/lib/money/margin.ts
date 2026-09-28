import type { PriceTier } from "../types";

// Pure margin math — no DB access, unit-tested in tests/margin.test.ts.
//
// Everything is computed per SELLABLE UNIT. A listing may bundle several units
// ("16 Family Rolls"), so both sides are divided by their pack quantity before
// anything is compared; otherwise a 16-pack looks like an 8x arbitrage against
// a 2-pack. Shipping and MOQ are amortised the same way.

export interface FeeParams {
  commissionPct: number;
  paymentFeePct: number;
  shipDomesticCny: number;
  shipCrossBorderCnyPerKg: number;
  assumedWeightKg: number;
  otherPct: number;

  // --- Landed-cost inputs (optional so callers can omit them; default 0) ---
  /** Per-unit fulfilment (FBA pick/pack) charged by the selling venue. */
  fulfilmentFeeCny?: number;
  /** Import duty applied to landed cost on the buy side. */
  importDutyPct?: number;
  /** Provision for refunds/returns, charged against the sell price. */
  returnsRatePct?: number;
  /** PPC / promoted-listing spend, charged against the sell price. */
  adSpendPct?: number;
  /** Category → referral %, overriding commissionPct when the category is known. */
  categoryFees?: Record<string, number> | null;
}

export interface MarginInput {
  buyPriceCny: number; // listing price on the buy side, already CNY
  sellPriceCny: number; // listing price on the sell side, already CNY
  buyFees: FeeParams;
  sellFees: FeeParams;
  crossBorder: boolean; // sell side ships internationally
  moq?: number | null;
  priceTiers?: PriceTier[] | null; // buy-side wholesale tiers (CNY)
  /** Units contained in one buy listing (default 1). */
  buyPackQty?: number | null;
  /** Units contained in one sell listing (default 1). */
  sellPackQty?: number | null;
  /** Actual shipping weight when known; falls back to sellFees.assumedWeightKg. */
  weightKg?: number | null;
  /** Sell-side marketplace category, for the referral-fee lookup. */
  category?: string | null;
}

export interface FeeLineItem {
  label: string;
  amountCny: number;
}

export interface MarginResult {
  buyPriceCny: number; // effective per-unit buy price (tier price at MOQ, pack-normalized)
  sellPriceCny: number; // per-unit sell price
  grossSpreadCny: number;
  netMarginCny: number;
  netMarginPct: number;
  /** Profit ÷ per-unit landed cost — what the cash actually earns. */
  roiPct: number;
  /** Sell price at which this breaks even, per unit. */
  breakEvenSellPriceCny: number;
  /** Landed cost per unit (buy + inbound freight + duty). */
  landedCostCny: number;
  moqUnits: number | null;
  capitalRequiredCny: number | null;
  feeBreakdown: FeeLineItem[];
}

/** Wholesale unit price at the given quantity: highest tier whose minQty <= qty. */
export function tierPriceAt(
  tiers: PriceTier[] | null | undefined,
  qty: number,
  fallback: number,
): number {
  if (!tiers || tiers.length === 0) return fallback;
  const eligible = tiers
    .filter((t) => t.minQty <= qty)
    .sort((a, b) => b.minQty - a.minQty);
  return eligible.length > 0 ? eligible[0].price : fallback;
}

/** Referral % for a category, falling back to the platform default. */
export function referralPct(fees: FeeParams, category?: string | null): number {
  if (category && fees.categoryFees) {
    const hit = fees.categoryFees[category] ?? fees.categoryFees[category.toLowerCase()];
    if (typeof hit === "number") return hit;
  }
  return fees.commissionPct;
}

export function computeMargin(input: MarginInput): MarginResult {
  const moq = input.moq ?? null;
  const buyPack = Math.max(1, input.buyPackQty ?? 1);
  const sellPack = Math.max(1, input.sellPackQty ?? 1);

  // Per-unit buy cost: wholesale tier at MOQ, then split across the bundle.
  const listingBuyPrice = tierPriceAt(
    input.priceTiers,
    moq ?? 1,
    input.buyPriceCny,
  );
  const buyUnit = listingBuyPrice / buyPack;
  const sellUnit = input.sellPriceCny / sellPack;

  const inboundShip = input.buyFees.shipDomesticCny / buyPack;
  // Duty is only owed when the goods actually cross a border. A domestic
  // 1688 -> JD trade must not be charged import duty.
  const dutyPct = input.crossBorder ? (input.buyFees.importDutyPct ?? 0) : 0;
  const duty = (buyUnit + inboundShip) * dutyPct;
  const landedCost = buyUnit + inboundShip + duty;

  const commissionPct = referralPct(input.sellFees, input.category);
  const sellCommission = sellUnit * commissionPct;
  const sellPayment = sellUnit * input.sellFees.paymentFeePct;
  const sellOther = sellUnit * input.sellFees.otherPct;
  const returns = sellUnit * (input.sellFees.returnsRatePct ?? 0);
  const ads = sellUnit * (input.sellFees.adSpendPct ?? 0);
  const fulfilment = input.sellFees.fulfilmentFeeCny ?? 0;

  const weightKg = input.weightKg ?? input.sellFees.assumedWeightKg;
  const outboundShip = input.crossBorder
    ? input.sellFees.shipCrossBorderCnyPerKg * weightKg
    : input.sellFees.shipDomesticCny;

  const feeBreakdown: FeeLineItem[] = [
    { label: "Buy price (unit)", amountCny: -buyUnit },
    { label: "Inbound shipping", amountCny: -inboundShip },
  ];
  if (duty !== 0) feeBreakdown.push({ label: "Import duty", amountCny: -duty });
  feeBreakdown.push(
    { label: "Sell price", amountCny: sellUnit },
    { label: "Marketplace commission", amountCny: -sellCommission },
    { label: "Payment fee", amountCny: -sellPayment },
    { label: "Returns/packaging buffer", amountCny: -sellOther },
  );
  if (returns !== 0)
    feeBreakdown.push({ label: "Returns provision", amountCny: -returns });
  if (ads !== 0)
    feeBreakdown.push({ label: "Advertising", amountCny: -ads });
  if (fulfilment !== 0)
    feeBreakdown.push({ label: "Fulfilment fee", amountCny: -fulfilment });
  feeBreakdown.push({
    label: input.crossBorder ? "Cross-border shipping" : "Outbound shipping",
    amountCny: -outboundShip,
  });

  const netMarginCny =
    sellUnit -
    sellCommission -
    sellPayment -
    sellOther -
    returns -
    ads -
    fulfilment -
    outboundShip -
    landedCost;

  // Percentage costs scale with the sell price, so break-even solves
  // S(1 − Σpct) = fixed costs.
  const pctSum =
    commissionPct +
    input.sellFees.paymentFeePct +
    input.sellFees.otherPct +
    (input.sellFees.returnsRatePct ?? 0) +
    (input.sellFees.adSpendPct ?? 0);
  const fixedCosts = landedCost + fulfilment + outboundShip;
  const breakEvenSellPriceCny =
    pctSum < 1 ? fixedCosts / (1 - pctSum) : Number.POSITIVE_INFINITY;

  // MOQ is expressed in listings; each listing carries buyPack sellable units.
  const unitsPurchased = moq !== null ? moq * buyPack : null;

  return {
    buyPriceCny: buyUnit,
    sellPriceCny: sellUnit,
    grossSpreadCny: sellUnit - buyUnit,
    netMarginCny,
    netMarginPct: sellUnit > 0 ? netMarginCny / sellUnit : 0,
    roiPct: landedCost > 0 ? netMarginCny / landedCost : 0,
    breakEvenSellPriceCny,
    landedCostCny: landedCost,
    moqUnits: moq,
    capitalRequiredCny: unitsPurchased !== null ? landedCost * unitsPurchased : null,
    feeBreakdown,
  };
}
