import type { Page } from "playwright";
import { closeQuietly, openPlatformContext } from "../browser";
import { randomDelay, withTimeout } from "../rate-limit";
import {
  CrawlError,
  type NormalizedListing,
  type PlatformAdapter,
} from "../types";
import { unreadableDetail } from "../detail";
import type { PriceTier } from "../../types";

// Alibaba.com is 1688's international storefront: the same factory supply, but
// public (no QR login), in English, quoted in USD, and — the reason it matters
// here — it states MOQ and a wholesale price ladder, which is what makes a
// sourcing price a real sourcing price rather than a retail sticker.

async function assertNotBlocked(page: Page) {
  const url = page.url();
  if (/\/(login|captcha|punish|_____tmd_____)/i.test(url)) {
    throw new CrawlError("CAPTCHA", `Alibaba anti-bot page: ${url}`);
  }
  // Alibaba serves the slider challenge on a 200 at the requested URL, so the
  // URL check alone reports it as a layout failure. Detect it by content.
  const title = await page.title().catch(() => "");
  if (/captcha|interception|unusual traffic/i.test(title)) {
    throw new CrawlError(
      "CAPTCHA",
      `Alibaba slider captcha — this IP is rate-limited/blocked (title: "${title}")`,
    );
  }
}

/** "$1.20 - $2.40" → [1.2, 2.4]; "$1.20" → [1.2, 1.2] */
function parsePriceRange(text: string): [number, number] | null {
  const nums = text
    .replace(/,/g, "")
    .match(/\$\s*(\d+(?:\.\d+)?)/g)
    ?.map((s) => parseFloat(s.replace(/[$\s]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!nums || nums.length === 0) return null;
  return [Math.min(...nums), Math.max(...nums)];
}

async function extractOffers(page: Page): Promise<NormalizedListing[]> {
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 1800);
    await page.waitForTimeout(600);
  }

  const raw = await page.evaluate(() => {
    const out: {
      itemId: string;
      href: string;
      title: string;
      cardText: string;
      img: string;
      supplier: string;
    }[] = [];
    const seen = new Set<string>();
    const anchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href*="/product-detail/"]'),
    );
    for (const a of anchors) {
      const m = a.href.match(/_(\d{8,})\.html/);
      if (!m || seen.has(m[1])) continue;
      const card =
        (a.closest(
          '[class*="offer"], [class*="card"], [class*="list-item"]',
        ) as HTMLElement | null) ?? a;
      const cardText = (card.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!/\$/.test(cardText)) continue;
      seen.add(m[1]);
      const img = card.querySelector("img");
      const title =
        (card.querySelector('h2, h3, [class*="title"]')?.textContent ?? "").trim() ||
        (img?.getAttribute("alt") ?? "").trim() ||
        (a.textContent ?? "").trim();
      const supplier = (
        card.querySelector('[class*="supplier"], [class*="company"]')?.textContent ??
        ""
      ).trim();
      out.push({
        itemId: m[1],
        href: a.href,
        title,
        cardText,
        img: img?.getAttribute("src") ?? "",
        supplier,
      });
    }
    return out;
  });

  const listings: NormalizedListing[] = [];
  for (const r of raw) {
    if (!r.title) continue;
    const range = parsePriceRange(r.cardText);
    if (!range) continue;
    const [low, high] = range;

    // "Min. order: 100 pieces" / "Min. Order: 2 sets"
    const moqMatch = r.cardText.match(/min\.?\s*order:?\s*([\d,]+)/i);
    const moq = moqMatch
      ? parseInt(moqMatch[1].replace(/,/g, ""), 10)
      : undefined;

    // Deliberately price at the HIGH end of the range. The low end is the
    // 10,000-unit tier; quoting it would manufacture margin that nobody buying
    // at MOQ will ever see. The range is kept in attributes for the detail view.
    listings.push({
      platform: "ALIBABA",
      itemId: r.itemId,
      url: r.href.split("?")[0],
      title: r.title,
      price: high,
      currency: "USD",
      imageUrl: r.img
        ? r.img.startsWith("//")
          ? `https:${r.img}`
          : r.img
        : undefined,
      shopName: r.supplier || undefined,
      moq: moq && moq > 0 ? moq : undefined,
      attributes:
        low !== high
          ? { priceRangeLowUsd: String(low), priceRangeHighUsd: String(high) }
          : undefined,
    });
  }
  return listings;
}

export function createAlibabaAdapter(): PlatformAdapter {
  return {
    platform: "ALIBABA",
    requiresLogin: false,
    async searchProducts(keyword, opts) {
      const ctx = await openPlatformContext("ALIBABA");
      try {
        const page = await ctx.newPage();
        const url = `https://www.alibaba.com/trade/search?IndexArea=product_en&SearchText=${encodeURIComponent(
          keyword,
        )}`;
        await withTimeout(
          page
            .goto(url, { waitUntil: "domcontentloaded", timeout: 90000 })
            .then(() => {}),
          95000,
          "Alibaba search navigation",
        );
        await page.waitForTimeout(4000);
        await assertNotBlocked(page);

        const listings = await extractOffers(page);
        if (listings.length === 0) {
          await assertNotBlocked(page);
          throw new CrawlError(
            "TIMEOUT",
            `Alibaba offer cards not found (layout change or soft block) — page title: "${await page.title()}"`,
          );
        }
        await randomDelay();
        return listings.slice(0, opts?.maxResults ?? 90);
      } finally {
        await closeQuietly(ctx);
      }
    },
    async fetchDetail(itemId) {
      const ctx = await openPlatformContext("ALIBABA");
      try {
        const page = await ctx.newPage();
        await page.goto(
          `https://www.alibaba.com/product-detail/p_${itemId}.html`,
          { waitUntil: "domcontentloaded", timeout: 60000 },
        );
        await page.waitForTimeout(3000);
        await assertNotBlocked(page);

        const detail = await page.evaluate(() => {
          const title = (
            document.querySelector('h1, [class*="product-title"]')?.textContent ?? ""
          ).trim();
          // Ladder rows: "1 - 99 pieces  $2.40" / ">= 1000 pieces  $1.20"
          const rows = Array.from(
            document.querySelectorAll(
              '[class*="ladder"], [class*="price-item"], [class*="price-range"] li',
            ),
          ).map((n) => (n.textContent ?? "").replace(/\s+/g, " ").trim());
          const body = (document.body.textContent ?? "").replace(/\s+/g, " ");
          return { title, rows, body: body.slice(0, 4000) };
        });

        const tiers: PriceTier[] = [];
        for (const row of detail.rows) {
          const qty = row.replace(/,/g, "").match(/(\d+)/);
          const price = row.replace(/,/g, "").match(/\$\s*(\d+(?:\.\d+)?)/);
          if (qty && price) {
            tiers.push({
              minQty: parseInt(qty[1], 10),
              price: parseFloat(price[1]),
            });
          }
        }
        tiers.sort((a, b) => a.minQty - b.minQty);

        const fallback = parsePriceRange(detail.body);
        const price = tiers.length > 0 ? tiers[0].price : (fallback?.[1] ?? null);
        if (!detail.title || price === null) return unreadableDetail("Alibaba", itemId, detail.body);

        const moqMatch = detail.body.match(/min\.?\s*order:?\s*([\d,]+)/i);
        const moq =
          tiers.length > 0
            ? tiers[0].minQty
            : moqMatch
              ? parseInt(moqMatch[1].replace(/,/g, ""), 10)
              : undefined;

        return {
          platform: "ALIBABA",
          itemId,
          url: `https://www.alibaba.com/product-detail/p_${itemId}.html`,
          title: detail.title,
          price,
          currency: "USD",
          moq,
          priceTiers: tiers.length > 0 ? tiers : undefined,
        };
      } finally {
        await closeQuietly(ctx);
      }
    },
  };
}
