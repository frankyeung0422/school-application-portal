// 拼單 Pools — threshold group-buys. Pure; tests/pools.test.ts.
//
// Buyers commit with a saved card and pay nothing. When enough units are
// committed to reach the supplier's first wholesale tier, the pool unlocks:
//   1. every commitment is AUTHORIZED (a hold, not a charge) at the unlock price,
//      which is never above what that buyer agreed to when they joined;
//   2. declines are counted, and the price the SUCCESSFUL quantity actually earns
//      is recomputed;
//   3. if the pool still clears a tier we CAPTURE — absorbing any gap within a
//      budget — otherwise we VOID every hold. Nobody is charged and refunded.
// Authorize-then-capture is what makes "never overcharge, never charge for a
// pool that failed" true by construction instead of by a refund loop.

import { landedQuote, type SourceProfile } from "./money/landed";
import { storefrontPrice, type CheckoutFees } from "./money/pricing";
import type { FxMids, Rail } from "./money/fx";
import type { PriceTier } from "./types";

export interface LadderStep {
  minQty: number;
  unitHkdCents: number;
}

export interface BuildLadderInput {
  price: number;
  currency: string;
  priceTiers: PriceTier[] | null;
  moq: number | null;
  packQty: number | null;
  weightKg: number | null;
  profile: SourceProfile;
  mids: FxMids;
  rail: Rail;
  targetMarginPct: number;
  checkoutFees?: CheckoutFees;
}

/**
 * Buyer price per unit at each supplier tier. Steps that would not lower the
 * price are dropped: a ladder rung that saves nobody anything is just noise.
 */
export function buildLadder(input: BuildLadderInput): { ladder: LadderStep[]; singleUnitHkdCents: number } {
  const unitPrice = (qty: number) => {
    const q = landedQuote({
      price: input.price,
      currency: input.currency,
      qty,
      priceTiers: input.priceTiers,
      moq: null, // the pool buys in bulk; MOQ is what the first rung satisfies
      packQty: input.packQty,
      weightKg: input.weightKg,
      profile: input.profile,
      mids: input.mids,
      payWith: { kind: "RAIL", rail: input.rail },
    });
    return storefrontPrice({
      costCents: q.perUnitHkdCents,
      buyerRouteCents: null,
      targetMarginPct: input.targetMarginPct,
      checkoutFees: input.checkoutFees,
    }).priceCents;
  };

  const singleUnitHkdCents = unitPrice(1);
  const qtys = new Set<number>();
  if (input.moq && input.moq > 1) qtys.add(input.moq);
  for (const t of input.priceTiers ?? []) if (t.minQty > 1) qtys.add(t.minQty);

  const ladder: LadderStep[] = [];
  let last = singleUnitHkdCents;
  for (const minQty of [...qtys].sort((a, b) => a - b)) {
    const unit = unitPrice(minQty);
    if (unit < last) {
      ladder.push({ minQty, unitHkdCents: unit });
      last = unit;
    }
  }
  return { ladder, singleUnitHkdCents };
}

export interface TierState {
  unlocked: boolean;
  /** Price per unit at the committed quantity (first rung's price while locked). */
  unitHkdCents: number;
  stepIndex: number;
  next: { minQty: number; unitHkdCents: number; needed: number } | null;
}

export function tierFor(committedQty: number, ladder: LadderStep[]): TierState {
  if (ladder.length === 0) throw new Error("empty ladder");
  const steps = [...ladder].sort((a, b) => a.minQty - b.minQty);
  let idx = -1;
  for (let i = 0; i < steps.length; i++) if (steps[i].minQty <= committedQty) idx = i;
  const nextStep = steps[idx + 1];
  return {
    unlocked: idx >= 0,
    unitHkdCents: idx >= 0 ? steps[idx].unitHkdCents : steps[0].unitHkdCents,
    stepIndex: idx,
    next: nextStep
      ? { minQty: nextStep.minQty, unitHkdCents: nextStep.unitHkdCents, needed: nextStep.minQty - committedQty }
      : null,
  };
}

export interface PoolState {
  status: string;
  committedQty: number;
  ladder: LadderStep[];
  deadline: Date;
}

export function canUnlock(pool: PoolState, now: Date): { ok: boolean; expired: boolean; reason: string } {
  if (pool.status !== "OPEN") return { ok: false, expired: false, reason: `pool is ${pool.status}` };
  const t = tierFor(pool.committedQty, pool.ladder);
  if (t.unlocked) return { ok: true, expired: false, reason: "first tier reached" };
  if (now.getTime() > pool.deadline.getTime()) {
    return { ok: false, expired: true, reason: "deadline passed below the first tier — nobody is charged" };
  }
  return { ok: false, expired: false, reason: `${t.next?.needed ?? 0} more unit(s) needed` };
}

export interface CommitmentForSettle {
  id: number;
  qty: number;
  maxUnitHkdCents: number;
}

/** The hold to place on each commitment at unlock. */
export function authorizationPlan(commitments: CommitmentForSettle[], ladder: LadderStep[]) {
  const total = commitments.reduce((s, c) => s + c.qty, 0);
  const target = tierFor(total, ladder).unitHkdCents;
  return {
    targetUnitHkdCents: target,
    holds: commitments.map((c) => {
      const unit = Math.min(c.maxUnitHkdCents, target);
      return { id: c.id, unitHkdCents: unit, amountCents: unit * c.qty };
    }),
  };
}

export type SettleDecision = "CAPTURE_ALL" | "CAPTURE_ABSORB" | "VOID_ALL";

export interface SettleResult {
  decision: SettleDecision;
  authorizedQty: number;
  /** Price the successful quantity actually earns at the supplier's ladder. */
  earnedUnitHkdCents: number | null;
  absorbCents: number;
  captures: { id: number; amountCents: number }[];
  voids: number[];
  reason: string;
}

export function settleUnlock(
  commitments: CommitmentForSettle[],
  authResults: Record<number, "AUTHORIZED" | "DECLINED">,
  ladder: LadderStep[],
  maxAbsorbCents: number,
): SettleResult {
  const plan = authorizationPlan(commitments, ladder);
  const holds = new Map(plan.holds.map((h) => [h.id, h]));
  const ok = commitments.filter((c) => authResults[c.id] === "AUTHORIZED");
  const authorizedQty = ok.reduce((s, c) => s + c.qty, 0);
  const okIds = ok.map((c) => c.id);

  const earned = tierFor(authorizedQty, ladder);
  if (!earned.unlocked) {
    return {
      decision: "VOID_ALL",
      authorizedQty,
      earnedUnitHkdCents: null,
      absorbCents: 0,
      captures: [],
      voids: okIds,
      reason: `Declines left ${authorizedQty} unit(s), below the first tier — every hold voided`,
    };
  }

  // What we will capture is the hold (≤ what each buyer agreed). The gap between
  // that and what the earned tier costs is ours to absorb — or not.
  const captured = ok.reduce((s, c) => s + holds.get(c.id)!.amountCents, 0);
  const owed = earned.unitHkdCents * authorizedQty;
  const absorbCents = Math.max(0, owed - captured);

  const captures = ok.map((c) => ({ id: c.id, amountCents: holds.get(c.id)!.amountCents }));
  if (absorbCents === 0) {
    return {
      decision: "CAPTURE_ALL",
      authorizedQty,
      earnedUnitHkdCents: earned.unitHkdCents,
      absorbCents: 0,
      captures,
      voids: [],
      reason: "Tier held — capture every hold",
    };
  }
  if (absorbCents <= maxAbsorbCents) {
    return {
      decision: "CAPTURE_ABSORB",
      authorizedQty,
      earnedUnitHkdCents: earned.unitHkdCents,
      absorbCents,
      captures,
      voids: [],
      reason: `Declines dropped a tier; absorbing HK$${(absorbCents / 100).toFixed(2)} within budget`,
    };
  }
  return {
    decision: "VOID_ALL",
    authorizedQty,
    earnedUnitHkdCents: earned.unitHkdCents,
    absorbCents,
    captures: [],
    voids: okIds,
    reason: `Declines dropped a tier; gap HK$${(absorbCents / 100).toFixed(2)} exceeds absorb budget — every hold voided`,
  };
}
