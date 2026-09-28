import type { Page } from "playwright";
import { closeQuietly, openPlatformContext } from "../browser";
import { randomDelay, withTimeout } from "../rate-limit";
import {
  CrawlError,
  type DiscoveredCandidate,
  type NormalizedListing,
  type PlatformAdapter,
  type SoldComps,
} from "../types";

// eBay reskins its SRP roughly yearly. 2026: li.s-card[data-listingid];
// 2025: .su-item-card; older: .s-item. All three are kept so a reskin degrades
// to a partial result instead of a hard failure.
const CARD_SEL = "li.s-card[data-listingid], .su-item-card, .s-item";
// Price MUST come from a dedicated price node. The old code fell back to the
// card's full textContent and grabbed the first "$N" anywhere in it, which is
// how a $30 tumbler was recorded at $225 and ranked first on the dashboard.
const PRICE_SEL =
  ".s-card__price, .su-item-card__price, .s-item__price, [data-testid='item-price']";
// The 2026 card has no title class; the title is the first primary styled span
// inside the item link. Ordered, not comma-joined — a comma list would return
// whichever matches first in document order, which can be "Opens in a new tab".
const TITLE_SELECTORS = [
  ".s-card__title",
  ".su-item-card__title",
  ".s-item__title",
  "a.s-card__link span.su-styled-text.primary.default",
  "a[href*='/itm/'] span.su-styled-text",
];

interface RawCard {
  listingId: string;
  title: string;
  priceText: string;
  href: string;
  img: string;
  cardText: string;
}

function readCards(page: Page): Promise<RawCard[]> {
  return page.$$eval(
    CARD_SEL,
    (nodes, [priceSel, titleSels]: [string, string[]]) =>
      nodes.map((n) => {
        let title = "";
        for (const sel of titleSels) {
          const t = (n.querySelector(sel)?.textContent ?? "").trim();
          if (t) {
            title = t;
            break;
          }
        }
        return {
          listingId: n.getAttribute("data-listingid") ?? "",
          title,
          priceText: n.querySelector(priceSel)?.textContent ?? "",
          href: n.querySelector<HTMLAnchorElement>("a[href*='/itm/']")?.href ?? "",
          img: n.querySelector<HTMLImageElement>("img")?.src ?? "",
          cardText: (n.textContent ?? "").replace(/\s+/g, " "),
        };
      }),
    [PRICE_SEL, TITLE_SELECTORS] as [string, string[]],
  );
}

/** "106 sold" on the card — per-listing demand, free with the search page. */
function parseSold(cardText: string): number | undefined {
  const m = cardText.replace(/,/g, "").match(/(\d+)\+?\s*sold\b/i);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Lowest price in the text — eBay renders ranges as "$12.34 to $56.78". */
function parsePrice(text: string): number | null {
  const all = text.replace(/,/g, "").match(/\$\s*(\d+(?:\.\d+)?)/g);
  if (!all) return null;
  const nums = all
    .map((s) => parseFloat(s.replace(/[$\s]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  return nums.length > 0 ? Math.min(...nums) : null;
}

async function gotoResults(page: Page, url: string, label: string) {
  await withTimeout(
    page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }).then(() => {}),
    65000,
    `${label} navigation`,
  );
  const landed = page.url();
  if (/signin\.ebay\.com|splashui\/captcha/.test(landed)) {
    throw new CrawlError(
      "LOGIN_WALL",
      `${label}: eBay demanded sign-in/verification. Run \`npm run login -- ebay\` once.`,
    );
  }
  const ok = await page
    .waitForSelector(CARD_SEL, { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  if (!ok) {
    throw new CrawlError(
      "TIMEOUT",
      `${label}: results did not render — page title: "${await page.title()}", url: ${landed}`,
    );
  }
}

export function createEbayAdapter(): PlatformAdapter {
  return {
    platform: "EBAY",
    requiresLogin: false,
    async searchProducts(keyword, opts) {
      const ctx = await openPlatformContext("EBAY");
      try {
        const page = await ctx.newPage();
        // LH_BIN=1: fixed-price only. An in-flight auction bid is not a price
        // anyone can buy or sell at, so it must not become a comp.
        const base = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keyword)}`;
        try {
          await gotoResults(page, `${base}&_ipg=60&LH_BIN=1&rt=nc`, "eBay search");
        } catch (e) {
          if (!(e instanceof CrawlError)) throw e;
          // One retry on the plain legacy URL before declaring the layout broken.
          await page.waitForTimeout(2000);
          await gotoResults(page, `${base}&_ipg=60`, "eBay search (retry)");
        }

        const raw = await readCards(page);
        const out: NormalizedListing[] = [];
        const seen = new Set<string>();
        for (const r of raw) {
          if (!r.title || r.title === "Shop on eBay") continue;
          const itemId = r.listingId || r.href.match(/\/itm\/(\d+)/)?.[1] || "";
          const price = parsePrice(r.priceText);
          if (!itemId || price === null || seen.has(itemId)) continue;
          seen.add(itemId);
          out.push({
            platform: "EBAY",
            itemId,
            url: `https://www.ebay.com/itm/${itemId}`,
            title: r.title,
            price,
            currency: "USD",
            imageUrl: r.img || undefined,
            soldCount: parseSold(r.cardText),
          });
        }
        await randomDelay();
        return out.slice(0, opts?.maxResults ?? 90);
      } finally {
        await closeQuietly(ctx);
      }
    },
    async fetchDetail(itemId) {
      // VERIFY jobs re-price both sides from the item page. Without this the
      // whole Amazon<->eBay lane is unverifiable and stays score-capped at 70.
      const ctx = await openPlatformContext("EBAY");
      try {
        const page = await ctx.newPage();
        await withTimeout(
          page
            .goto(`https://www.ebay.com/itm/${itemId}`, {
              waitUntil: "domcontentloaded",
              timeout: 60000,
            })
            .then(() => {}),
          65000,
          "eBay item navigation",
        );
        if (/signin\.ebay\.com|splashui\/captcha/.test(page.url())) {
          throw new CrawlError("LOGIN_WALL", "eBay demanded verification on the item page");
        }
        // The item page renders title and price client-side AND re-navigates
        // shortly after load. A waitForSelector gate gets bound to the doomed
        // context and reports "did not render" for pages that render fine — so
        // settle on a timer instead and let the read below retry.
        await page.waitForTimeout(4000);

        // eBay re-navigates the item page shortly after load (URL rewrite), which
        // destroys the execution context mid-evaluate. Settle and retry once.
        const readDetail = () =>
          page.evaluate(() => {
            // Ordered probing, never a comma-joined querySelector: that returns
            // the first match in DOCUMENT order, and `[itemprop=price]` appears
            // inside sponsored/related-item microdata far above the real price.
            // It silently recorded $1.65 for a $16.54 listing.
            const PRICE_SELECTORS = [
              ".x-price-primary .ux-textspans",
              ".x-price-primary",
              ".x-bin-price__content",
              "#prcIsum",
              "#mm-saleDscPrc",
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
            const TITLE_SELECTORS = [
              ".x-item-title__mainTitle",
              "h1.x-item-title__mainTitle",
              "[data-testid='x-item-title']",
              "h1",
            ];
            let title = "";
            for (const sel of TITLE_SELECTORS) {
              const t = (document.querySelector(sel)?.textContent ?? "").trim();
              if (t) {
                title = t;
                break;
              }
            }
            const ended =
              /this listing (has ended|was ended)|no longer available/i.test(
                document.body?.textContent ?? "",
              );
            return { title, priceText, ended };
          });

        let detail = await readDetail().catch(() => null);
        if (!detail || !detail.title || !detail.priceText) {
          await page
            .waitForLoadState("domcontentloaded", { timeout: 20000 })
            .catch(() => {});
          await page.waitForTimeout(3000);
          detail = await readDetail();
        }

        // Precedence matters. A rendered price proves the listing is live, so it
        // wins over the ended-text scan — that scan reads the whole body and
        // matches "no longer available" inside sponsored-item carousels, which
        // would have marked live listings STALE.
        // null = confirmed gone (VERIFY marks STALE); throw = could not read
        // (VERIFY leaves the row alone).
        const price = parsePrice(detail.priceText);
        if (detail.title && price !== null) {
          await randomDelay();
          return {
            platform: "EBAY" as const,
            itemId,
            url: `https://www.ebay.com/itm/${itemId}`,
            title: detail.title,
            price,
            currency: "USD" as const,
          };
        }
        if (detail.ended) return null;
        throw new CrawlError(
          "ERROR",
          `eBay item ${itemId}: could not read title/price (title="${detail.title.slice(0, 40)}", price="${detail.priceText.slice(0, 40)}")`,
        );
      } finally {
        await closeQuietly(ctx);
      }
    },
    async fetchSoldComps(keyword) {
      const ctx = await openPlatformContext("EBAY");
      try {
        const page = await ctx.newPage();
        const base = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keyword)}`;
        await gotoResults(
          page,
          `${base}&_ipg=60&LH_Sold=1&LH_Complete=1`,
          "eBay sold comps",
        );

        const raw = await readCards(page);
        const prices: number[] = [];
        const seen = new Set<string>();
        for (const r of raw) {
          if (!r.title || r.title === "Shop on eBay") continue;
          const itemId = r.listingId || r.href.match(/\/itm\/(\d+)/)?.[1] || "";
          if (!itemId || seen.has(itemId)) continue;
          seen.add(itemId);
          const price = parsePrice(r.priceText);
          if (price !== null) prices.push(price);
        }

        // eBay prints "1,234 results" above the grid; that is the true sold
        // count for the window, while our sample is capped at one page.
        const headerCount = await page.evaluate(() => {
          const nodes = Array.from(
            document.querySelectorAll(
              ".srp-controls__count-heading, .result-count__count-heading, h1, h2",
            ),
          );
          for (const n of nodes) {
            const m = (n.textContent ?? "")
              .replace(/,/g, "")
              .match(/([\d]+)\+?\s*results?/i);
            if (m) return parseInt(m[1], 10);
          }
          return 0;
        });

        prices.sort((a, b) => a - b);
        const median =
          prices.length > 0
            ? prices.length % 2 === 1
              ? prices[(prices.length - 1) / 2]
              : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
            : null;

        await randomDelay();
        const comps: SoldComps = {
          keyword,
          platform: "EBAY",
          soldCount: Math.max(headerCount, prices.length),
          medianPriceUsd: median,
          sampleSize: prices.length,
        };
        return comps;
      } finally {
        await closeQuietly(ctx);
      }
    },
    async discoverProducts(opts) {
      const ctx = await openPlatformContext("EBAY");
      try {
        const page = await ctx.newPage();
        await withTimeout(
          page
            .goto("https://www.ebay.com/deals", { waitUntil: "domcontentloaded" })
            .then(() => {}),
          60000,
          "eBay deals navigation",
        );
        const CARD_SEL = ".dne-itemtile, .su-item-card, [data-listing-id]";
        await page.waitForSelector(CARD_SEL, { timeout: 20000 }).catch(() => {
          throw new CrawlError("TIMEOUT", "eBay deals did not render");
        });

        const raw = await page.$$eval(CARD_SEL, (nodes) =>
          nodes.map((n) => {
            const title = (
              n.querySelector(
                ".dne-itemtile-title, .su-item-card__title, [class*='title']",
              )?.textContent ?? ""
            ).trim();
            const priceText =
              n.querySelector("[class*='price'], .first")?.textContent ?? "";
            const href =
              n.querySelector<HTMLAnchorElement>("a[href*='/itm/']")?.href ?? "";
            const img = n.querySelector<HTMLImageElement>("img")?.src ?? "";
            return { title, priceText, href, img };
          }),
        );

        const out: DiscoveredCandidate[] = [];
        const seen = new Set<string>();
        for (const r of raw) {
          if (!r.title || r.title === "Shop on eBay" || seen.has(r.title))
            continue;
          seen.add(r.title);
          const m = r.priceText.replace(/,/g, "").match(/\$\s*(\d+(?:\.\d+)?)/);
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
