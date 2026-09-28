// Listing guard: a live marketplace listing must never be able to sell at a
// loss because a supplier changed their price or ran out. Pure;
// tests/guard.test.ts.

export interface ChannelFees {
  commissionPct: number;
  paymentFeePct: number;
  fixedFeeHkdCents: number;
}

export interface GuardInput {
  listedPriceCents: number;
  /** Our live all-in cost per unit; null when no orderable source remains. */
  liveCostCents: number | null;
  inStock: boolean;
  fees: ChannelFees;
  marginFloorPct: number;
  /** Largest automatic price rise before we delist instead (buyers notice). */
  maxRepricePct: number;
}

export type GuardVerdict =
  | { verdict: "KEEP"; marginPct: number; reason: string }
  | { verdict: "REPRICE"; newPriceCents: number; marginPct: number; reason: string }
  | { verdict: "DELIST"; marginPct: number | null; reason: string };

export function channelNetCents(priceCents: number, costCents: number, fees: ChannelFees): number {
  return (
    priceCents -
    Math.round(priceCents * (fees.commissionPct + fees.paymentFeePct)) -
    fees.fixedFeeHkdCents -
    costCents
  );
}

/** Lowest whole-dollar price that clears the floor on this channel. */
export function channelPriceFor(costCents: number, fees: ChannelFees, marginPct: number): number {
  const denom = 1 - fees.commissionPct - fees.paymentFeePct - marginPct;
  if (denom <= 0) throw new Error("channel fees + margin must be < 100%");
  return Math.ceil((costCents + fees.fixedFeeHkdCents) / denom / 100) * 100;
}

export function listingGuard(i: GuardInput): GuardVerdict {
  if (!i.inStock || i.liveCostCents == null) {
    return { verdict: "DELIST", marginPct: null, reason: "No in-stock orderable source — delist before it oversells" };
  }
  const net = channelNetCents(i.listedPriceCents, i.liveCostCents, i.fees);
  const marginPct = net / i.listedPriceCents;
  if (marginPct >= i.marginFloorPct) {
    return { verdict: "KEEP", marginPct, reason: `Margin ${(marginPct * 100).toFixed(1)}% ≥ floor` };
  }
  const required = channelPriceFor(i.liveCostCents, i.fees, i.marginFloorPct);
  if (required <= i.listedPriceCents * (1 + i.maxRepricePct)) {
    const newMargin = channelNetCents(required, i.liveCostCents, i.fees) / required;
    return {
      verdict: "REPRICE",
      newPriceCents: required,
      marginPct: newMargin,
      reason: `Cost rose; reprice HK$${(i.listedPriceCents / 100).toFixed(0)} → HK$${(required / 100).toFixed(0)} to hold the floor`,
    };
  }
  return {
    verdict: "DELIST",
    marginPct,
    reason: `Margin ${(marginPct * 100).toFixed(1)}% below floor and the fix needs a >${(i.maxRepricePct * 100).toFixed(0)}% price rise — delist`,
  };
}
