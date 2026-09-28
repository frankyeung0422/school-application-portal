import type { Offer } from "@prisma/client";
import { prisma } from "../prisma";
import { quoteOffer } from "../catalog";
import { loadMids, loadProfiles } from "../settings";
import { recordSearch } from "../demand";
import { rankFuzzy } from "../search/fuzzy";
import { detectLuxury, type LuxuryCategory } from "./brands";
import { authenticityRisk, PLATFORM_POLICY, LUXURY_SEED_QUERIES, type RiskResult } from "./risk";

// Read model for /luxury. One shared FX/profile context for the whole list —
// the per-product pricer would reload it for every row.

export interface LuxuryOfferRow {
  offer: Offer;
  landedCents: number;
  risk: RiskResult;
}

export interface LuxuryRow {
  product: { id: number; slug: string; title: string; brand: string | null; imageUrl: string | null; sourceCount: number; lastPricedAt: Date | null; officialRef?: string | null };
  category: LuxuryCategory;
  rows: LuxuryOfferRow[];
  /** Cheapest offer that is not high-risk — what we are willing to call cheapest. */
  bestTrustedCents: number | null;
  bestTrustedPlatform: string | null;
  /** Cheapest listing of any kind, for the "too good to be true" contrast. */
  cheapestAnyCents: number | null;
  highRiskCount: number;
  /** Listings removed as counterfeit — counted, never silently dropped. */
  hiddenSuspectCount: number;
}

export interface LuxuryRowWithOfficial extends LuxuryRow {
  /** Official HK boutique price for this reference, when the brand publishes one. */
  officialHkCents: number | null;
  officialRef: string | null;
}

export async function listLuxuryProducts(opts: { q?: string; brand?: string; category?: string; take?: number; skip?: number; includeSuspect?: boolean } = {}) {
  const q = opts.q?.trim();
  const loaded = await prisma.product.findMany({
    where: {
      segment: "LUXURY",
      ...(opts.brand ? { brand: opts.brand } : {}),
    },
    include: { offers: true },
    take: 2000,
  });
  const products = q ? rankFuzzy(q, loaded, (p) => `${p.brand ?? ""} ${p.title}`).map((m) => m.row) : loaded;
  const [profiles, { mids }] = await Promise.all([loadProfiles(), loadMids()]);

  const out: LuxuryRow[] = [];
  for (const p of products) {
    const category = detectLuxury(p.title)?.category ?? "ACCESSORY";
    if (opts.category && category !== opts.category) continue;
    const priced = p.offers
      // Screened-out counterfeits are not prices; they never enter the comparison.
      .filter((o) => o.inStock && (opts.includeSuspect || !o.suspectCounterfeit))
      .map((offer) => ({ offer, landed: quoteOffer(offer, 1, { kind: "CARD" }, profiles, mids) }))
      .filter((x): x is { offer: Offer; landed: NonNullable<typeof x.landed> } => x.landed != null)
      .map((x) => ({ offer: x.offer, landedCents: x.landed.perUnitHkdCents }));
    if (!priced.length) continue;

    const trustedPrices = priced
      .filter((x) => (PLATFORM_POLICY[x.offer.platform]?.base ?? "MEDIUM") !== "HIGH")
      .map((x) => x.landedCents)
      .sort((a, b) => a - b);
    const median = trustedPrices.length ? trustedPrices[Math.floor((trustedPrices.length - 1) / 2)] : null;

    const rows: LuxuryOfferRow[] = priced
      .map((x) => ({
        ...x,
        risk: authenticityRisk({
          platform: x.offer.platform,
          category,
          priceCents: x.landedCents,
          medianTrustedCents: median,
          sellerRating: x.offer.rating,
          reviewCount: x.offer.reviewCount,
        }),
      }))
      .sort((a, b) => a.landedCents - b.landedCents);

    const bestTrusted = rows.find((r) => r.risk.level !== "HIGH") ?? null;
    out.push({
      product: p,
      category,
      rows,
      bestTrustedCents: bestTrusted?.landedCents ?? null,
      bestTrustedPlatform: bestTrusted?.offer.platform ?? null,
      cheapestAnyCents: rows[0]?.landedCents ?? null,
      highRiskCount: rows.filter((r) => r.risk.level === "HIGH").length,
      hiddenSuspectCount: p.offers.filter((o) => o.inStock && o.suspectCounterfeit).length,
    });
  }
  out.sort((a, b) => b.rows.length - a.rows.length || (a.bestTrustedCents ?? Infinity) - (b.bestTrustedCents ?? Infinity));
  const skip = opts.skip ?? 0;
  const page = out.slice(skip, skip + (opts.take ?? 30));

  // Anchor each listing against the brand's own HK price where we have it.
  const { officialHkPrices } = await import("../official/view");
  const refs = page.map((r) => (r.product as { officialRef?: string | null }).officialRef).filter((r): r is string => Boolean(r));
  const official = await officialHkPrices([...new Set(refs)]);
  const items: LuxuryRowWithOfficial[] = page.map((r) => {
    const ref = (r.product as { officialRef?: string | null }).officialRef ?? null;
    return { ...r, officialRef: ref, officialHkCents: ref ? (official.get(ref) ?? null) : null };
  });
  return { total: out.length, items };
}

export async function luxuryBrands() {
  const rows = await prisma.product.groupBy({ by: ["brand"], where: { segment: "LUXURY", brand: { not: null } }, _count: true });
  return rows.map((r) => ({ brand: r.brand as string, count: r._count })).sort((a, b) => b.count - a.count);
}

/** Queue the curated luxury searches so the page has real listings to compare. */
export async function seedLuxurySearches() {
  const queued: string[] = [];
  for (const q of LUXURY_SEED_QUERIES) {
    const r = await recordSearch(q);
    if (r.crawlJobId) queued.push(q);
  }
  return { queries: LUXURY_SEED_QUERIES.length, queued };
}
