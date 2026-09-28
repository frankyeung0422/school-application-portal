// Per-unit pricing: the only way two pack sizes can be compared honestly.
// Pure; tests/unitprice.test.ts.
//
// 維他奶 236ml at HK$6 next to 946ml at HK$13 tells a shopper nothing. Per
// 100ml it is HK$2.54 vs HK$1.37 — a different decision. Where no size can be
// read from the title we show nothing rather than inventing one.

import { parsePackQty, parseUnitSize, type SizeDim, type UnitSize } from "../match/attributes";

export interface UnitPrice {
  /** Price per basis unit, in HKD cents. */
  cents: number;
  /** e.g. "每 100 毫升", "每件". */
  labelZh: string;
  labelEn: string;
  dim: SizeDim;
  /** Total content the price buys, in the dimension's base unit. */
  totalUnits: number;
}

/** How each dimension is quoted. Groceries are compared per 100g/100ml, never per gram. */
const BASIS: Partial<Record<SizeDim, { per: number; zh: string; en: string }>> = {
  volume: { per: 100, zh: "每 100 毫升", en: "per 100ml" },
  mass: { per: 100, zh: "每 100 克", en: "per 100g" },
  ounce: { per: 1, zh: "每安士", en: "per oz" },
  count: { per: 1, zh: "每件", en: "per piece" },
  // length is deliberately absent: nobody buys groceries by the millimetre.
};

export function unitPriceOf(priceCents: number, size: UnitSize | null, packQty: number | null): UnitPrice | null {
  if (!size || !(priceCents > 0)) return null;
  const basis = BASIS[size.dim];
  if (!basis) return null;
  const totalUnits = size.value * Math.max(1, packQty ?? 1);
  if (!(totalUnits > 0)) return null;
  return {
    cents: Math.round((priceCents / totalUnits) * basis.per),
    labelZh: basis.zh,
    labelEn: basis.en,
    dim: size.dim,
    totalUnits,
  };
}

/**
 * Size for a product, from the Chinese title first and the English one as a
 * fallback — the feed often states the size in only one of the two.
 */
export function sizeFromTitles(titleZh: string, titleEn?: string | null): { size: UnitSize | null; packQty: number | null } {
  const size = parseUnitSize(titleZh) ?? (titleEn ? parseUnitSize(titleEn) : null);
  const packQty = parsePackQty(titleZh) ?? (titleEn ? parsePackQty(titleEn) : null);
  return { size, packQty };
}

export function unitPriceFromTitles(priceCents: number, titleZh: string, titleEn?: string | null): UnitPrice | null {
  const { size, packQty } = sizeFromTitles(titleZh, titleEn);
  // A multi-pack states both ("250ml x 6"), but a bare "6片" is already the count.
  const qty = size?.dim === "count" ? null : packQty;
  return unitPriceOf(priceCents, size, qty);
}

/** Cheapest per-unit row, ignoring rows we could not price per unit. */
export function cheapestPerUnit<T extends { unit: UnitPrice | null }>(rows: T[]): T | null {
  const priced = rows.filter((r) => r.unit);
  if (!priced.length) return null;
  return priced.reduce((a, b) => (b.unit!.cents < a.unit!.cents ? b : a));
}
