// 優惠真相: what a supermarket promotion or a bigger pack is really worth.
// Pure; tests/promo-truth.test.ts.
//
// The Consumer Council found 「買一送一」 on one soy sauce was only 16% off, and
// bigger packs costing up to 35% more per unit — but no shopper tool does the
// maths per item. This does, from the promo rules and pack sizes we already parse.

import type { PromoVerdict } from "./promo";

export type TruthLabel = "FAKE" | "WEAK" | "REAL";

/** Under this, a "promotion" is noise: 5% off a HK$20 item is a dollar. */
export const WEAK_BELOW = 0.05;

export interface PromoTruth {
  label: TruthLabel;
  /** Effective discount vs buying the same quantity at shelf price (negative = costs more). */
  pctOff: number;
  qty: number;
  savingCents: number;
}

export function promoTruth(v: PromoVerdict | null): PromoTruth | null {
  if (!v || !(v.plainTotalCents > 0)) return null;
  const pctOff = v.savingCents / v.plainTotalCents;
  const label: TruthLabel = v.kind !== "BETTER" ? "FAKE" : pctOff < WEAK_BELOW ? "WEAK" : "REAL";
  return { label, pctOff, qty: v.qty, savingCents: v.savingCents };
}

export const TRUTH_TEXT: Record<TruthLabel, (t: PromoTruth) => string> = {
  FAKE: (t) => (t.pctOff < 0 ? `假優惠：買 ${t.qty} 件反而貴 ${Math.abs(t.pctOff * 100).toFixed(0)}%` : "假優惠：同散買一樣價"),
  WEAK: (t) => `實際只平 ${(t.pctOff * 100).toFixed(1)}%`,
  REAL: (t) => `實際折扣 ${(t.pctOff * 100).toFixed(0)}%`,
};

// ── Pack-size traps ─────────────────────────────────────────────────────────

const SIZE_TOKENS =
  /(\d+(?:\.\d+)?\s*(?:x|×|\*)\s*)?\d+(?:\.\d+)?\s*(?:ml|l|litre|liter|g|kg|gm|oz|fl oz|lb|pcs?|pieces?|packs?|sheets?|rolls?|bags?|cans?|bottles?|tabs?|caps?|毫升|公升|升|克|公斤|千克|片|包|個|支|罐|樽|瓶|入|粒|卷|張|條|盒|袋|件)(?![a-z])/gi;

/**
 * Same product in different sizes → same key. Brand + title with every size and
 * count token removed. Conservative on purpose: "Soya Milk Low Sugar" and "Soya
 * Milk" stay different families, so a trap is never a comparison of two products.
 */
export function familyKey(brand: string | null, title: string): string | null {
  const core = title
    .toLowerCase()
    .replace(SIZE_TOKENS, " ")
    .replace(/(?:x|×|\*)\s*\d+/g, " ") // "250ml x 6": the trailing count
    .replace(/[()（）\[\]【】,，.+&\-/]/g, " ")
    .replace(/\b(x|×)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (core.length < 3) return null;
  return `${(brand ?? "").toLowerCase().trim()}|${core}`;
}

export interface PackRow {
  productId: number;
  title: string;
  slug: string;
  chain: string;
  family: string;
  dim: string;
  /** Total content in base units (ml, g, pieces). */
  totalUnits: number;
  /** Price per basis unit, HKD cents (unitPriceOf). */
  unitCents: number;
  shelfCents: number;
}

export interface PackTrap {
  chain: string;
  small: PackRow;
  big: PackRow;
  /** How much dearer per unit the bigger pack is, e.g. 0.35. */
  dearerBy: number;
}

/** Minimum size step that counts as "a bigger pack", and minimum per-unit gap to report. */
export const TRAP_MIN_SIZE_RATIO = 1.2;
export const TRAP_MIN_GAP = 0.03;

/** Per family and chain: the bigger pack that costs more per unit than a smaller one. Worst first. */
export function packTraps(rows: PackRow[]): PackTrap[] {
  const groups = new Map<string, PackRow[]>();
  for (const r of rows) {
    if (!(r.totalUnits > 0) || !(r.unitCents > 0)) continue;
    const k = `${r.family}|${r.chain}|${r.dim}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const traps: PackTrap[] = [];
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const sorted = [...g].sort((a, b) => a.totalUnits - b.totalUnits);
    let worst: PackTrap | null = null;
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const small = sorted[i];
        const big = sorted[j];
        if (big.totalUnits < small.totalUnits * TRAP_MIN_SIZE_RATIO) continue; // a relabel, not a bigger pack
        const dearerBy = big.unitCents / small.unitCents - 1;
        if (dearerBy >= TRAP_MIN_GAP && (!worst || dearerBy > worst.dearerBy)) worst = { chain: small.chain, small, big, dearerBy };
      }
    }
    if (worst) traps.push(worst);
  }
  return traps.sort((a, b) => b.dearerBy - a.dearerBy);
}
