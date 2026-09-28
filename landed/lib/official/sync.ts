import { prisma } from "../prisma";
import { loadMids } from "../settings";
import { randomDelay } from "../sources/rate-limit";
import { OFFICIAL_CATALOGUE, referencesIn, type OfficialItem } from "./catalogue";
import { extractFromJsonLd, isPlausibleOfficialPrice } from "./extract";
import { MARKET_RULES } from "./markets";

// Reads manufacturer prices from brand boutique sites, one market at a time.
// Deliberately slow and small: these are seven pages per brand, not a crawl.

export type OfficialFetcher = (url: string) => Promise<{ priceNative: number; currency: string } | null>;

/**
 * One browser for the whole run — launching Chromium per page turned a 30-second
 * job into three minutes. Caller must close it.
 */
export async function createOfficialFetcher(): Promise<{ fetch: OfficialFetcher; close: () => Promise<void> }> {
  const { chromium } = await import("playwright-extra");
  const stealth = (await import("puppeteer-extra-plugin-stealth")).default;
  chromium.use(stealth());
  const browser = await chromium.launch({ headless: process.env.HEADLESS !== "false" });
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  return {
    async fetch(url: string) {
      const page = await ctx.newPage();
      try {
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
        if (!res || res.status() >= 400) return null;
        // Prices are injected after hydration on every one of these sites.
        await page.waitForTimeout(3500);
        const blocks = await page.$$eval('script[type="application/ld+json"]', (nodes) => nodes.map((n) => n.textContent ?? ""));
        const price = extractFromJsonLd(blocks);
        return price && isPlausibleOfficialPrice(price) ? price : null;
      } finally {
        await page.close().catch(() => {});
      }
    },
    close: async () => {
      await browser.close().catch(() => {});
    },
  };
}

export interface OfficialSyncResult {
  items: number;
  stored: number;
  failures: string[];
}

export async function syncOfficialPrices(opts: { items?: OfficialItem[]; fetcher?: OfficialFetcher } = {}): Promise<OfficialSyncResult> {
  const items = opts.items ?? OFFICIAL_CATALOGUE;
  const browser = opts.fetcher ? null : await createOfficialFetcher();
  const fetcher = opts.fetcher ?? browser!.fetch;
  try {
    return await run(items, fetcher, Boolean(opts.fetcher));
  } finally {
    await browser?.close();
  }
}

async function run(items: OfficialItem[], fetcher: OfficialFetcher, injected: boolean): Promise<OfficialSyncResult> {
  const { mids } = await loadMids();
  const failures: string[] = [];
  let stored = 0;

  for (const item of items) {
    for (const market of item.markets) {
      const url = item.path(market);
      try {
        const price = await fetcher(url);
        if (!price) {
          failures.push(`${item.brand} ${item.reference} ${market}: no published price`);
          continue;
        }
        const expected = MARKET_RULES[market].currency;
        if (price.currency !== expected) {
          // A different currency means we landed on the wrong market's page.
          failures.push(`${item.brand} ${item.reference} ${market}: got ${price.currency}, expected ${expected}`);
          continue;
        }
        const mid = market === "HK" ? 1 : mids[price.currency];
        if (!mid) {
          failures.push(`${item.brand} ${item.reference} ${market}: no FX mid for ${price.currency}`);
          continue;
        }
        const data = {
          brand: item.brand,
          reference: item.reference,
          market,
          currency: price.currency,
          priceNative: price.priceNative,
          priceHkdCents: Math.round(price.priceNative * mid * 100),
          url,
          capturedAt: new Date(),
        };
        await prisma.officialPrice.upsert({
          where: { brand_reference_market: { brand: item.brand, reference: item.reference, market } },
          create: data,
          update: data,
        });
        stored++;
      } catch (e) {
        failures.push(`${item.brand} ${item.reference} ${market}: ${e instanceof Error ? e.message.slice(0, 80) : e}`);
      }
      if (!injected) await randomDelay(1500, 4000);
    }
  }
  await linkProductsToReferences();
  return { items: items.length, stored, failures };
}

/** Tie marketplace products to a manufacturer reference found in their title. */
export async function linkProductsToReferences() {
  const products = await prisma.product.findMany({ where: { segment: "LUXURY", officialRef: null }, select: { id: true, title: true } });
  let linked = 0;
  for (const p of products) {
    const [ref] = referencesIn(p.title);
    if (!ref) continue;
    await prisma.product.update({ where: { id: p.id }, data: { officialRef: ref } });
    linked++;
  }
  return linked;
}

export async function officialPricesFor(reference: string) {
  return prisma.officialPrice.findMany({ where: { reference }, orderBy: { priceHkdCents: "asc" } });
}
