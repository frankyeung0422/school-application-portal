import type { Page } from "playwright";
import { closeQuietly, openPlatformContext } from "../browser";
import { randomDelay, withTimeout } from "../rate-limit";
import {
  CrawlError,
  type DiscoveredCandidate,
  type NormalizedListing,
  type PlatformAdapter,
} from "../types";

async function assertNotBlocked(page: Page) {
  const title = await page.title().catch(() => "");
  if (/robot check|captcha/i.test(title)) {
    throw new CrawlError("CAPTCHA", "Amazon robot check page");
  }
  const hasCaptchaForm = await page
    .locator('form[action*="validateCaptcha"]')
    .count()
    .catch(() => 0);
  if (hasCaptchaForm > 0) {
    throw new CrawlError("CAPTCHA", "Amazon captcha form present");
  }
}

export function createAmazonAdapter(): PlatformAdapter {
  return {
    platform: "AMAZON",
    requiresLogin: false,
    async searchProducts(keyword, opts) {
      const ctx = await openPlatformContext("AMAZON");
      try {
        // the server's IP may geo-map to a non-US locale — force USD pricing
        await ctx.addCookies([
          { name: "i18n-prefs", value: "USD", domain: ".amazon.com", path: "/" },
        ]);
        const page = await ctx.newPage();
        await withTimeout(
          page
            .goto(`https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`, {
              waitUntil: "domcontentloaded",
            })
            .then(() => {}),
          60000,
          "Amazon search navigation",
        );
        await assertNotBlocked(page);
        await page
          .waitForSelector('[data-component-type="s-search-result"]', {
            timeout: 20000,
          })
          .catch(async () => {
            await assertNotBlocked(page);
            throw new CrawlError("TIMEOUT", "Amazon results did not render");
          });

        const raw = await page.$$eval(
          '[data-component-type="s-search-result"]',
          (nodes) =>
            nodes.map((n) => {
              const asin = n.getAttribute("data-asin") ?? "";
              // h2 alone is sometimes just the brand; title-recipe has brand+title
              const title = (
                n.querySelector("[data-cy='title-recipe']")?.textContent ??
                n.querySelector("h2")?.textContent ??
                ""
              ).trim();
              const priceText =
                n.querySelector(".a-price .a-offscreen")?.textContent ?? "";
              const href =
                n.querySelector<HTMLAnchorElement>("h2 a, a.a-link-normal")
                  ?.href ?? "";
              const img =
                n.querySelector<HTMLImageElement>("img.s-image")?.src ?? "";
              // Rating/reviews/"bought in past month" are already in the card —
              // they were being discarded, leaving the ranker with no demand data.
              const ratingText =
                n.querySelector("[aria-label*='out of 5 stars']")?.getAttribute("aria-label") ??
                n.querySelector(".a-icon-alt")?.textContent ??
                "";
              const cardText = (n.textContent ?? "").replace(/\s+/g, " ");
              return { asin, title, priceText, href, img, ratingText, cardText };
            }),
        );

        const out: NormalizedListing[] = [];
        const seen = new Set<string>();
        for (const r of raw) {
          const m = r.priceText.replace(/,/g, "").match(/\$(\d+(?:\.\d+)?)/);
          if (!r.asin || !r.title || !m || seen.has(r.asin)) continue;
          seen.add(r.asin);
          const rating = r.ratingText.match(/([\d.]+)\s*out of 5/i);
          // "4,271 ratings" or a bare "(4,271)" next to the stars
          const reviews = r.cardText.match(/([\d,]+)\s*ratings?\b/i);
          // "2K+ bought in past month" / "500+ bought in past month"
          const bought = r.cardText.match(
            /([\d,.]+)\s*(k|m)?\+?\s*bought in past month/i,
          );
          const boughtMult = bought?.[2]
            ? bought[2].toLowerCase() === "k"
              ? 1000
              : 1000000
            : 1;
          out.push({
            platform: "AMAZON",
            itemId: r.asin,
            url: r.href || `https://www.amazon.com/dp/${r.asin}`,
            title: r.title,
            price: parseFloat(m[1]),
            currency: "USD",
            imageUrl: r.img || undefined,
            rating: rating ? parseFloat(rating[1]) : undefined,
            reviewCount: reviews
              ? parseInt(reviews[1].replace(/,/g, ""), 10)
              : undefined,
            boughtPastMonth: bought
              ? Math.round(parseFloat(bought[1].replace(/,/g, "")) * boughtMult)
              : undefined,
          });
        }
        await randomDelay();
        return out.slice(0, opts?.maxResults ?? 90);
      } finally {
        await closeQuietly(ctx);
      }
    },
    async fetchDetail(itemId) {
      // VERIFY jobs re-price both sides from the product page. Without this the
      // whole Amazon<->eBay lane is unverifiable and stays score-capped at 70.
      const ctx = await openPlatformContext("AMAZON");
      try {
        await ctx.addCookies([
          { name: "i18n-prefs", value: "USD", domain: ".amazon.com", path: "/" },
        ]);
        const page = await ctx.newPage();
        await withTimeout(
          page
            .goto(`https://www.amazon.com/dp/${itemId}`, {
              waitUntil: "domcontentloaded",
              timeout: 60000,
            })
            .then(() => {}),
          65000,
          "Amazon detail navigation",
        );
        await assertNotBlocked(page);
        const rendered = await page
          .waitForSelector("#productTitle", { timeout: 20000 })
          .then(() => true)
          .catch(() => false);
        if (!rendered) {
          await assertNotBlocked(page);
          throw new CrawlError(
            "TIMEOUT",
            `Amazon ${itemId} detail did not render — page title: "${await page.title()}"`,
          );
        }

        // The price block paints after the title, and several `.a-offscreen`
        // nodes are present but EMPTY — a comma-joined querySelector returns the
        // first empty one and looks like "no price". Probe in priority order.
        await page.waitForTimeout(2500);
        const detail = await page.evaluate(() => {
          const PRICE_SELECTORS = [
            "#corePrice_feature_div .a-offscreen",
            "#corePriceDisplay_desktop_feature_div .a-offscreen",
            "#apex_desktop .a-offscreen",
            "#price_inside_buybox",
            "#priceblock_ourprice",
            "#priceblock_dealprice",
            ".a-price-range .a-offscreen",
            "#centerCol .a-price .a-offscreen",
            ".a-price .a-offscreen",
          ];
          let priceText = "";
          for (const sel of PRICE_SELECTORS) {
            for (const n of Array.from(document.querySelectorAll(sel))) {
              const t = (n.textContent ?? "").trim();
              if (/\$\s*\d/.test(t)) {
                priceText = t;
                break;
              }
            }
            if (priceText) break;
          }
          const title = (
            document.querySelector("#productTitle")?.textContent ?? ""
          ).trim();
          const unavailable = /currently unavailable|we don't know when or if this item/i.test(
            document.querySelector("#availability")?.textContent ?? "",
          );
          const category =
            document
              .querySelector("#wayfinding-breadcrumbs_feature_div li a")
              ?.textContent?.trim() ?? "";
          return { title, priceText, unavailable, category };
        });

        // Same precedence as eBay: a rendered price proves the product is
        // buyable. null = confirmed unavailable (VERIFY marks STALE);
        // throw = could not read (VERIFY leaves the row alone).
        const m = detail.priceText.replace(/,/g, "").match(/\$(\d+(?:\.\d+)?)/);
        if (detail.title && m) {
          await randomDelay();
          return {
            platform: "AMAZON" as const,
            itemId,
            url: `https://www.amazon.com/dp/${itemId}`,
            title: detail.title,
            price: parseFloat(m[1]),
            currency: "USD" as const,
            category: detail.category || undefined,
          };
        }
        if (detail.unavailable) return null;
        throw new CrawlError(
          "ERROR",
          `Amazon ${itemId}: could not read title/price (title="${detail.title.slice(0, 40)}", price="${detail.priceText.slice(0, 40)}")`,
        );
      } finally {
        await closeQuietly(ctx);
      }
    },
    async discoverProducts(opts) {
      const ctx = await openPlatformContext("AMAZON");
      try {
        await ctx.addCookies([
          { name: "i18n-prefs", value: "USD", domain: ".amazon.com", path: "/" },
        ]);
        const page = await ctx.newPage();
        await withTimeout(
          page
            .goto("https://www.amazon.com/Best-Sellers/zgbs", {
              waitUntil: "domcontentloaded",
            })
            .then(() => {}),
          60000,
          "Amazon bestsellers navigation",
        );
        await assertNotBlocked(page);
        // grid faceout cards; class names are build-obfuscated so match loosely
        const CARD_SEL =
          '#gridItemRoot, [class*="p13n-sc-uncoverable-faceout"]';
        await page
          .waitForSelector(CARD_SEL, { timeout: 20000 })
          .catch(async () => {
            await assertNotBlocked(page);
            throw new CrawlError("TIMEOUT", "Amazon bestsellers did not render");
          });

        const raw = await page.$$eval(CARD_SEL, (nodes) =>
          nodes.map((n) => {
            // carousel layout uses p13n-sc-truncate, grid layout line-clamp
            const title = (
              n.querySelector(
                '[class*="p13n-sc-truncate"], [class*="line-clamp"]',
              )?.textContent ??
              n.querySelector("img")?.getAttribute("alt") ??
              ""
            ).trim();
            const href =
              n.querySelector<HTMLAnchorElement>('a[href*="/dp/"]')?.href ?? "";
            const priceText =
              n.querySelector('[class*="price"]')?.textContent ?? "";
            const img = n.querySelector<HTMLImageElement>("img")?.src ?? "";
            return { title, href, priceText, img };
          }),
        );

        const out: DiscoveredCandidate[] = [];
        const seen = new Set<string>();
        for (const r of raw) {
          if (!r.title || seen.has(r.title)) continue;
          seen.add(r.title);
          const m = r.priceText.replace(/,/g, "").match(/\$(\d+(?:\.\d+)?)/);
          out.push({
            title: r.title,
            url: r.href || undefined,
            price: m ? parseFloat(m[1]) : undefined,
            currency: m ? "USD" : undefined,
            imageUrl: r.img || undefined,
          });
        }
        await randomDelay();
        return out.slice(0, opts?.maxResults ?? 30);
      } finally {
        await closeQuietly(ctx);
      }
    },
  };
}
