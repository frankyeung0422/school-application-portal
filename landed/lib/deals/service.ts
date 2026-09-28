import { prisma } from "../prisma";
import { listSupermarketProducts, productHistory } from "../supermarket/view";
import { promoCadence } from "../supermarket/history";
import { RETAILER_INFO, isRetailer } from "../supermarket/retailers";
import { crossChainDeal, dealStrength, historyDeal, promoCycleDeal, type DealReason } from "./score";

// "Worth buying now": supermarket items and online products whose price today
// is backed by evidence (see ./score.ts). Recomputed at most every 30 minutes;
// the underlying prices only change a few times a day.

export interface Deal {
  productId: number;
  slug: string;
  title: string;
  segment: "SUPERMARKET" | "GLOBAL";
  priceCents: number;
  /** Supermarket: the chain with that price, for "nearest branch". */
  retailer: string | null;
  retailerName: string | null;
  reasons: DealReason[];
  strength: number;
}

const CACHE_MS = 30 * 60_000;
let cache: { at: number; deals: Deal[] } | null = null;

async function supermarketDeals(): Promise<Deal[]> {
  const { items } = await listSupermarketProducts({ sort: "gap", take: 60 });
  const out: Deal[] = [];
  for (const i of items) {
    // Cheapest *trusted* chain: a flagged low outlier is more likely a data error than a bargain.
    const cheapest = i.rows.find((r) => !i.outlierRetailers.includes(r.retailer));
    if (!cheapest) continue;
    const priceCents = cheapest.shelfCents;
    const reasons: DealReason[] = [];
    const retailerName = isRetailer(cheapest.retailer) ? RETAILER_INFO[cheapest.retailer].zh : cheapest.retailer;
    const cross = crossChainDeal({
      cheapestCents: priceCents,
      medianCents: priceCents + i.savingVsTypicalCents,
      chains: i.trustedChains,
      cheapestChain: retailerName,
    });
    if (cross) reasons.push(cross);
    const history = await productHistory(i.product.id, 90);
    const low = historyDeal(history, priceCents);
    if (low) reasons.push(low);
    const cycle = promoCycleDeal(promoCadence(history));
    if (cycle) reasons.push(cycle);
    if (!reasons.length) continue;
    out.push({
      productId: i.product.id,
      slug: i.product.slug,
      title: i.product.title,
      segment: "SUPERMARKET",
      priceCents,
      retailer: cheapest.retailer,
      retailerName,
      reasons,
      strength: dealStrength(reasons),
    });
  }
  return out;
}

async function onlineDeals(): Promise<Deal[]> {
  const products = await prisma.product.findMany({
    where: { segment: "GLOBAL", bestLandedHkdCents: { not: null }, sourceCount: { gte: 2 } },
    select: { id: true, slug: true, title: true, bestLandedHkdCents: true },
    orderBy: { sourceCount: "desc" },
    take: 300,
  });
  if (!products.length) return [];
  const since = new Date(Date.now() - 90 * 86400_000);
  const snaps = await prisma.offerSnapshot.findMany({
    where: { capturedAt: { gte: since }, landedHkdCents: { not: null }, inStock: true, offer: { productId: { in: products.map((p) => p.id) } } },
    select: { capturedAt: true, landedHkdCents: true, offer: { select: { productId: true } } },
  });
  // Cheapest landed price per product per HK day.
  const byProduct = new Map<number, Map<string, number>>();
  for (const s of snaps) {
    const pid = s.offer.productId;
    if (pid == null || s.landedHkdCents == null) continue;
    const day = new Date(s.capturedAt.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
    const days = byProduct.get(pid) ?? new Map<string, number>();
    days.set(day, Math.min(days.get(day) ?? Infinity, s.landedHkdCents));
    byProduct.set(pid, days);
  }
  const out: Deal[] = [];
  for (const p of products) {
    const days = byProduct.get(p.id);
    if (!days || p.bestLandedHkdCents == null) continue;
    const low = historyDeal([...days].map(([day, priceCents]) => ({ day, priceCents })), p.bestLandedHkdCents);
    if (!low) continue;
    out.push({ productId: p.id, slug: p.slug, title: p.title, segment: "GLOBAL", priceCents: p.bestLandedHkdCents, retailer: null, retailerName: null, reasons: [low], strength: dealStrength([low]) });
  }
  return out;
}

export async function worthBuyingNow(take = 12): Promise<Deal[]> {
  if (!cache || Date.now() - cache.at > CACHE_MS) {
    const [a, b] = await Promise.all([supermarketDeals(), onlineDeals()]);
    cache = { at: Date.now(), deals: [...a, ...b].sort((x, y) => y.strength - x.strength) };
  }
  return cache.deals.slice(0, take);
}
