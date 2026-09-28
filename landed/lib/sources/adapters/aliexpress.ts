import type { Page } from "playwright";
import { closeQuietly, openPlatformContext } from "../browser";
import { randomDelay, withTimeout } from "../rate-limit";
import {
  CrawlError,
  type NormalizedListing,
  type PlatformAdapter,
} from "../types";
import { unreadableDetail } from "../detail";

// AliExpress is the practical China sourcing feed for this tool: public (no QR
// login, unlike 1688/淘宝), English titles, USD prices, and — uniquely on the buy
// side — a visible "N sold" badge, which is the only free demand signal we get
// before a product is ever listed.
//
// Class names are build-hashed (`multi--price-sale--U-S0jtj`), so extraction is
// deliberately loose: locate item anchors, then regex the card's text.

// AliExpress geolocates by IP and will happily quote MYR/RUB/etc. The site's
// own locale switch writes this cookie; without it the "USD" in NormalizedListing
// is a lie and every FX conversion downstream is wrong.
const USUC_COOKIE = {
  name: "aep_usuc_f",
  value: "site=glo&c_tp=USD&region=US&b_locale=en_US",
  path: "/",
};

async function applyUsLocale(ctx: {
  addCookies: (c: { name: string; value: string; domain: string; path: string }[]) => Promise<void>;
}) {
  await ctx.addCookies(
    [".aliexpress.com", ".aliexpress.us"].map((domain) => ({
      ...USUC_COOKIE,
      domain,
    })),
  );
}

async function assertNotBlocked(page: Page) {
  const url = page.url();
  if (/\/(login|captcha|punish)/i.test(url)) {
    throw new CrawlError("CAPTCHA", `AliExpress anti-bot page: ${url}`);
  }
}

async function extractItems(page: Page): Promise<NormalizedListing[]> {
  // Results lazy-load on scroll.
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 1800);
    await page.waitForTimeout(600);
  }

  const raw = await page.evaluate(() => {
    const out: {
      itemId: string;
      title: string;
      cardText: string;
      img: string;
      store: string;
    }[] = [];
    const seen = new Set<string>();
    const anchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href*="/item/"]'),
    );
    for (const a of anchors) {
      const m = a.href.match(/\/item\/(\d+)\.html/);
      if (!m || seen.has(m[1])) continue;
      const card =
        (a.closest('[class*="card"], [class*="search-item"]') as HTMLElement | null) ??
        a;
      const cardText = (card.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!/\$/.test(cardText)) continue; // no price rendered = not a result card
      seen.add(m[1]);
      const img = card.querySelector("img");
      const title =
        (card.querySelector('h3, [class*="title"]')?.textContent ?? "").trim() ||
        (img?.getAttribute("alt") ?? "").trim() ||
        (a.getAttribute("title") ?? "").trim();
      const store = (
        card.querySelector('[class*="store"], [class*="seller"]')?.textContent ?? ""
      ).trim();
      out.push({
        itemId: m[1],
        title,
        cardText,
        img: img?.getAttribute("src") ?? "",
        store,
      });
    }
    return out;
  });

  const listings: NormalizedListing[] = [];
  for (const r of raw) {
    if (!r.title) continue;
    // Sale price is rendered first; a range ("$3.20 - $5.60") gives the low end,
    // which is the entry-level variant — take the low end deliberately and let
    // the VERIFY job confirm the real price on the detail page.
    const priceMatch = r.cardText.replace(/,/g, "").match(/\$\s*(\d+(?:\.\d+)?)/);
    if (!priceMatch) continue;
    const price = parseFloat(priceMatch[1]);
    if (!Number.isFinite(price) || price <= 0) continue;

    // "1,234 sold" / "2.5k+ sold" / "10,000+ sold"
    const soldMatch = r.cardText.match(/([\d,.]+)\s*(k)?\+?\s*sold/i);
    let soldCount: number | undefined;
    if (soldMatch) {
      const n = parseFloat(soldMatch[1].replace(/,/g, ""));
      if (Number.isFinite(n)) {
        soldCount = Math.round(n * (soldMatch[2] ? 1000 : 1));
      }
    }
    const ratingMatch = r.cardText.match(/\b([1-5](?:\.\d)?)\s*(?:\/\s*5|stars?)\b/i);

    listings.push({
      platform: "ALIEXPRESS",
      itemId: r.itemId,
      url: `https://www.aliexpress.com/item/${r.itemId}.html`,
      title: r.title,
      price,
      currency: "USD",
      imageUrl: r.img
        ? r.img.startsWith("//")
          ? `https:${r.img}`
          : r.img
        : undefined,
      shopName: r.store || undefined,
      soldCount,
      rating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined,
    });
  }
  return listings;
}

export function createAliexpressAdapter(): PlatformAdapter {
  return {
    platform: "ALIEXPRESS",
    requiresLogin: false,
    async searchProducts(keyword, opts) {
      const ctx = await openPlatformContext("ALIEXPRESS");
      try {
        await applyUsLocale(ctx);
        const page = await ctx.newPage();
        const url = `https://www.aliexpress.us/w/wholesale-${encodeURIComponent(
          keyword.replace(/\s+/g, "-"),
        )}.html?g=y&SortType=total_tranpro_desc`;
        // The page ships ~900KB of client-rendered JS; the Playwright default
        // 30s navigation budget is not enough on a cold cache.
        await withTimeout(
          page
            .goto(url, { waitUntil: "domcontentloaded", timeout: 90000 })
            .then(() => {}),
          95000,
          "AliExpress search navigation",
        );
        // The grid is client-rendered and <title> is set late — waiting on the
        // selector rather than a fixed delay would be nicer, but the class names
        // are build-hashed, so give hydration a real window.
        await page.waitForTimeout(6000);
        await assertNotBlocked(page);

        const listings = await extractItems(page);
        if (listings.length === 0) {
          await assertNotBlocked(page);
          throw new CrawlError(
            "TIMEOUT",
            `AliExpress item cards not found (layout change or soft block) — page title: "${await page.title()}"`,
          );
        }
        await randomDelay();
        return listings.slice(0, opts?.maxResults ?? 90);
      } finally {
        await closeQuietly(ctx);
      }
    },
    async fetchDetail(itemId) {
      const ctx = await openPlatformContext("ALIEXPRESS");
      try {
        await applyUsLocale(ctx);
        const page = await ctx.newPage();
        await page.goto(`https://www.aliexpress.us/item/${itemId}.html`, {
          waitUntil: "domcontentloaded",
          timeout: 90000,
        });
        await page.waitForTimeout(5000);
        await assertNotBlocked(page);

        const detail = await page.evaluate(() => {
          const title = (
            document.querySelector('h1, [class*="title--wrap"]')?.textContent ?? ""
          ).trim();
          const priceText = (
            document.querySelector('[class*="price--current"], [class*="product-price"]')
              ?.textContent ?? ""
          ).trim();
          const body = (document.body.textContent ?? "").replace(/\s+/g, " ");
          return { title, priceText, body: body.slice(0, 4000) };
        });

        const m = (detail.priceText || detail.body)
          .replace(/,/g, "")
          .match(/\$\s*(\d+(?:\.\d+)?)/);
        if (!detail.title || !m) return unreadableDetail("AliExpress", itemId, detail.body);
        return {
          platform: "ALIEXPRESS",
          itemId,
          url: `https://www.aliexpress.com/item/${itemId}.html`,
          title: detail.title,
          price: parseFloat(m[1]),
          currency: "USD",
        };
      } finally {
        await closeQuietly(ctx);
      }
    },
  };
}
