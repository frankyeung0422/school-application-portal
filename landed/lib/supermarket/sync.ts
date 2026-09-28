import { prisma } from "../prisma";
import { getFlag, setFlag } from "../settings";
import { slugify } from "../format";
import { normalizeOpw, type OpwItem } from "./opw";
import { OPW_RETAILERS, OPW_URL } from "./retailers";
import { sizeFromTitles } from "./unitprice";

// Daily sync of the Consumer Council Online Price Watch feed (≈2.7k items ×
// 9 chains). Exact product codes are shared across chains, so there is no
// fuzzy matching: every offer of a product has match confidence 1.

export const SUPERMARKET_KEYWORD = "supermarket";

export function opwProductUrl(code: string) {
  return `https://online-price-watch.consumer.org.hk/opw/product/${encodeURIComponent(code)}`;
}

/** Snapshot at most once a day unless the price moved — enough for the passport, bounded storage. */
const SNAPSHOT_EVERY_MS = 20 * 3600_000;
const BATCH = 100;

export async function fetchOpw(force = false): Promise<{ notModified: true } | { notModified: false; raw: unknown; etag: string | null }> {
  const etag = force ? "" : await getFlag("opw.etag", "");
  const res = await fetch(OPW_URL, {
    headers: etag ? { "If-None-Match": etag } : {},
    signal: AbortSignal.timeout(90_000),
  });
  if (res.status === 304) return { notModified: true };
  if (!res.ok) throw new Error(`Price Watch feed HTTP ${res.status}`);
  return { notModified: false, raw: await res.json(), etag: res.headers.get("etag") };
}

export async function syncSupermarkets(opts: { force?: boolean; raw?: unknown } = {}) {
  let raw = opts.raw;
  let etag: string | null = null;
  if (raw === undefined) {
    const fetched = await fetchOpw(opts.force);
    if (fetched.notModified) return { skipped: "feed not modified since last sync" };
    raw = fetched.raw;
    etag = fetched.etag;
  }
  const { items, skipped, unknownRetailers } = normalizeOpw(raw);
  if (items.length < 100 && !opts.raw) {
    // A truncated or broken feed must not mark the whole catalogue out of stock.
    throw new Error(`Price Watch feed has only ${items.length} items — refusing to sync`);
  }

  const now = new Date();
  const products = new Map(
    (await prisma.product.findMany({ where: { segment: "SUPERMARKET" }, select: { id: true, externalKey: true, historicalLowHkdCents: true } })).map((p) => [p.externalKey!, p]),
  );
  const offers = new Map(
    (
      await prisma.offer.findMany({
        where: { platform: { in: [...OPW_RETAILERS] } },
        select: { id: true, platform: true, itemId: true, latestPrice: true, lastCheckedAt: true, inStock: true },
      })
    ).map((o) => [`${o.platform}:${o.itemId}`, o]),
  );

  let created = 0;
  let snapshots = 0;
  const seen = new Set<string>();

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    // Create missing products first (ids are needed for slugs and offers).
    for (const item of batch) {
      const key = `opw:${item.code}`;
      if (products.has(key)) continue;
      const p = await prisma.product.create({
        data: {
          externalKey: key,
          segment: "SUPERMARKET",
          slug: `${slugify(item.titleEn).slice(0, 50)}-${item.code.toLowerCase()}`,
          title: item.titleZh,
          titleEn: item.titleEn,
          brand: item.brandZh,
          category: item.categoryZh,
          keyword: SUPERMARKET_KEYWORD,
        },
        select: { id: true, externalKey: true, historicalLowHkdCents: true },
      });
      products.set(key, p);
      created++;
    }

    const ops = [];
    for (const item of batch) {
      const product = products.get(`opw:${item.code}`)!;
      const best = bestPrice(item);
      ops.push(
        prisma.product.update({
          where: { id: product.id },
          data: {
            title: item.titleZh,
            titleEn: item.titleEn,
            category: item.categoryZh,
            bestLandedHkdCents: best.cents,
            sourceCount: item.prices.length,
            lastPricedAt: now,
            historicalLowHkdCents: Math.min(best.cents, product.historicalLowHkdCents ?? Number.MAX_SAFE_INTEGER),
          },
        }),
      );
      for (const price of item.prices) {
        const k = `${price.retailer}:${item.code}`;
        seen.add(k);
        const existing = offers.get(k);
        const promo = item.promos.find((p) => p.retailer === price.retailer);
        const priceHkd = price.priceCents / 100;
        const attributes = JSON.stringify(promo ? { promoEn: promo.en, promoZh: promo.zh } : {});
        const needSnapshot =
          !existing ||
          existing.latestPrice !== priceHkd ||
          !existing.inStock ||
          !existing.lastCheckedAt ||
          now.getTime() - existing.lastCheckedAt.getTime() >= SNAPSHOT_EVERY_MS;
        if (needSnapshot) snapshots++;
        const snapshot = needSnapshot
          ? {
              snapshots: {
                create: {
                  price: priceHkd,
                  currency: "HKD",
                  inStock: true,
                  landedHkdCents: price.priceCents,
                  // Promotion and pack size of the day: without these, shrinkflation
                  // and promo cycles are invisible however long we keep prices.
                  promoText: promo?.zh ?? null,
                  unitSizeLabel: sizeFromTitles(item.titleZh, item.titleEn).size?.label ?? null,
                },
              },
            }
          : {};
        const data = {
          productId: product.id,
          url: opwProductUrl(item.code),
          title: item.titleZh,
          currency: "HKD",
          latestPrice: priceHkd,
          attributes,
          category: item.categoryZh,
          inStock: true,
          matchConfidence: 1,
          ...(needSnapshot ? { lastCheckedAt: now } : {}),
        };
        ops.push(
          prisma.offer.upsert({
            where: { platform_itemId: { platform: price.retailer, itemId: item.code } },
            create: { platform: price.retailer, itemId: item.code, keyword: SUPERMARKET_KEYWORD, lastCheckedAt: now, ...data, ...snapshot },
            update: { ...data, ...snapshot },
          }),
        );
      }
    }
    await prisma.$transaction(ops);
  }

  // A chain that stopped listing an item: out of stock there, not deleted (history stays).
  const gone = [...offers.entries()].filter(([k, o]) => !seen.has(k) && o.inStock).map(([, o]) => o.id);
  for (let i = 0; i < gone.length; i += 500) {
    await prisma.offer.updateMany({ where: { id: { in: gone.slice(i, i + 500) } }, data: { inStock: false, lastCheckedAt: now } });
  }
  // Best-offer pointers need offer ids, so they are filled after the upserts.
  await refreshBestOfferIds();

  if (etag) await setFlag("opw.etag", etag);
  await setFlag("opw.lastSyncAt", now.toISOString());
  return { items: items.length, productsCreated: created, snapshots, offersGone: gone.length, skipped, unknownRetailers };
}

/** Headline = cheapest single unit at shelf price; promotions are shown per chain, not folded in. */
function bestPrice(item: OpwItem) {
  return { cents: Math.min(...item.prices.map((p) => p.priceCents)) };
}

async function refreshBestOfferIds() {
  const rows = await prisma.offer.findMany({
    where: { platform: { in: [...OPW_RETAILERS] }, inStock: true, productId: { not: null } },
    select: { id: true, productId: true, latestPrice: true },
    orderBy: { latestPrice: "asc" },
  });
  const best = new Map<number, number>();
  for (const r of rows) if (!best.has(r.productId!)) best.set(r.productId!, r.id);
  const entries = [...best.entries()];
  for (let i = 0; i < entries.length; i += 200) {
    await prisma.$transaction(entries.slice(i, i + 200).map(([productId, offerId]) => prisma.product.update({ where: { id: productId }, data: { bestOfferId: offerId } })));
  }
}
