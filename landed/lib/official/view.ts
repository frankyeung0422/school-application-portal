import { prisma } from "../prisma";
import { loadMids } from "../settings";
import { OFFICIAL_CATALOGUE } from "./catalogue";
import { compareMarkets, MARKET_RULES, type Market, type MarketComparison } from "./markets";

// Official boutique prices, converted at today's mid rate (the stored HKD value
// is a snapshot; FX moves faster than boutique prices do).

export interface OfficialComparison {
  brand: string;
  reference: string;
  title: string;
  category: string;
  comparison: MarketComparison;
  capturedAt: Date | null;
  /** Markets we could not read, so the table never pretends to be complete. */
  missingMarkets: Market[];
}

export async function officialComparisons(references?: string[]): Promise<OfficialComparison[]> {
  const rows = await prisma.officialPrice.findMany({ where: references?.length ? { reference: { in: references } } : {} });
  const { mids } = await loadMids();
  const byRef = new Map<string, typeof rows>();
  for (const r of rows) byRef.set(r.reference, [...(byRef.get(r.reference) ?? []), r]);

  const out: OfficialComparison[] = [];
  for (const item of OFFICIAL_CATALOGUE) {
    const found = byRef.get(item.reference);
    if (!found?.length) continue;
    const comparison = compareMarkets(
      found.map((r) => ({
        market: r.market as Market,
        priceNative: r.priceNative,
        currency: r.currency,
        midToHkd: r.market === "HK" ? 1 : (mids[r.currency] ?? 0),
      })).filter((r) => r.midToHkd > 0),
    );
    out.push({
      brand: item.brand,
      reference: item.reference,
      title: item.title,
      category: item.category,
      comparison,
      capturedAt: found.reduce<Date | null>((a, r) => (!a || r.capturedAt > a ? r.capturedAt : a), null),
      missingMarkets: item.markets.filter((m) => !found.some((r) => r.market === m)),
    });
  }
  return out.sort((a, b) => (b.comparison.hkSavingCents ?? 0) - (a.comparison.hkSavingCents ?? 0));
}

/** Official HK price per reference — the anchor a marketplace listing is judged against. */
export async function officialHkPrices(references: string[]): Promise<Map<string, number>> {
  if (!references.length) return new Map();
  const rows = await prisma.officialPrice.findMany({ where: { reference: { in: references }, market: "HK" } });
  const { mids } = await loadMids();
  return new Map(rows.map((r) => [r.reference, Math.round(r.priceNative * (r.market === "HK" ? 1 : (mids[r.currency] ?? 1)) * 100)]));
}

export function marketLabel(m: Market): string {
  return MARKET_RULES[m].label;
}
