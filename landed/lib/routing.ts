// Order routing: which supplier gets a paid order. Pure; tests/routing.test.ts.
//
// Two decisions, kept separate on purpose:
//   routeOrder  — among sources we can actually place orders with, pick the
//                 cheapest *expected* cost, with ranked fallbacks.
//   guardMargin — right before placing, compare the price we locked for the
//                 buyer with what the supplier charges NOW. Small drift we
//                 absorb; drift that eats the margin floor goes to a human.
// We never silently place an order at a loss, and never re-charge the buyer.

import type { FulfilmentMode } from "./types";
import { UNKNOWN_SELLER_RELIABILITY } from "./rank";

export interface RoutableOffer {
  offerId: number;
  supplierMode: FulfilmentMode;
  /** All-in cost for this order's quantity via the settlement rail. */
  costCents: number;
  inStock: boolean;
  matchConfidence: number;
  supplierReliability: number | null;
  /** The source's MOQ exceeds this order — buying it would leave us holding stock. Pools only. */
  moqForced?: boolean;
}

export interface RouteDecision {
  chosen: RoutableOffer | null;
  fallbacks: RoutableOffer[];
  reason: string;
}

export const MIN_ROUTING_MATCH = 0.85;
/** API suppliers win ties within this cost band — no human keystrokes, fewer errors. */
export const API_PREFERENCE_BAND = 0.02;

function expectedCost(o: RoutableOffer): number {
  // A seller that fails 1 in 10 orders costs us refunds and re-routing; price it in.
  return o.costCents / (o.supplierReliability ?? UNKNOWN_SELLER_RELIABILITY);
}

export function routeOrder(offers: RoutableOffer[]): RouteDecision {
  const excluded: string[] = [];
  const usable = offers.filter((o) => {
    if (o.supplierMode === "AFFILIATE_ONLY") return false;
    if (!o.inStock) {
      excluded.push(`#${o.offerId} out of stock`);
      return false;
    }
    if (o.moqForced) {
      excluded.push(`#${o.offerId} MOQ above order qty (pool only)`);
      return false;
    }
    if (o.matchConfidence < MIN_ROUTING_MATCH) {
      excluded.push(`#${o.offerId} match ${o.matchConfidence.toFixed(2)}`);
      return false;
    }
    return true;
  });
  if (usable.length === 0) {
    return {
      chosen: null,
      fallbacks: [],
      reason: `No orderable in-stock verified source${excluded.length ? ` (${excluded.join("; ")})` : ""}`,
    };
  }
  usable.sort((a, b) => expectedCost(a) - expectedCost(b));
  let chosen = usable[0];
  if (chosen.supplierMode !== "API") {
    const api = usable.find(
      (o) => o.supplierMode === "API" && expectedCost(o) <= expectedCost(chosen) * (1 + API_PREFERENCE_BAND),
    );
    if (api) chosen = api;
  }
  const fallbacks = usable.filter((o) => o !== chosen);
  const reason =
    `Lowest expected cost HK$${(chosen.costCents / 100).toFixed(2)} via ${chosen.supplierMode}` +
    (fallbacks.length ? `; ${fallbacks.length} fallback(s)` : "; no fallback");
  return { chosen, fallbacks, reason };
}

export type MarginGuardAction = "PROCEED" | "PROCEED_ABSORB" | "NEEDS_DECISION";

export interface MarginGuardInput {
  /** What the buyer paid (goods portion, excl. nothing — the order total). */
  priceCents: number;
  lockedCostCents: number;
  liveCostCents: number;
  /** Checkout processor fee already incurred on the buyer's payment. */
  checkoutFeeCents: number;
  floorPct: number;
}

export interface MarginGuardResult {
  action: MarginGuardAction;
  driftCents: number;
  liveMarginCents: number;
  liveMarginPct: number;
  reason: string;
}

export function guardMargin(i: MarginGuardInput): MarginGuardResult {
  const driftCents = i.liveCostCents - i.lockedCostCents;
  const liveMarginCents = i.priceCents - i.checkoutFeeCents - i.liveCostCents;
  const liveMarginPct = i.priceCents > 0 ? liveMarginCents / i.priceCents : 0;
  if (driftCents <= 0) {
    return { action: "PROCEED", driftCents, liveMarginCents, liveMarginPct, reason: "Cost at or below the locked quote" };
  }
  if (liveMarginPct >= i.floorPct) {
    return {
      action: "PROCEED_ABSORB",
      driftCents,
      liveMarginCents,
      liveMarginPct,
      reason: `Cost rose HK$${(driftCents / 100).toFixed(2)}; margin ${(liveMarginPct * 100).toFixed(1)}% still ≥ floor — absorbed`,
    };
  }
  return {
    action: "NEEDS_DECISION",
    driftCents,
    liveMarginCents,
    liveMarginPct,
    reason: `Cost rose HK$${(driftCents / 100).toFixed(2)}; margin ${(liveMarginPct * 100).toFixed(1)}% below ${(i.floorPct * 100).toFixed(0)}% floor — absorb, switch supplier, or refund`,
  };
}
