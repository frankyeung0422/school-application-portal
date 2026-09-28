import type { Page } from "playwright";
import { closeQuietly, openPlatformContext } from "../browser";
import { randomDelay, withTimeout } from "../rate-limit";
import { CrawlError, type NormalizedListing, type PlatformAdapter } from "../types";
import { unreadableDetail } from "../detail";

const MAX_PAGES = 2;

function parsePrice(text: string): number | null {
  const m = text.replace(/[,¥￥\s]/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

async function extractPage(page: Page): Promise<NormalizedListing[]> {
  // Second half of JD results lazy-loads on scroll.
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(600);
  }
  const items = await page.$$eval("#J_goodsList .gl-item", (nodes) =>
    nodes.map((n) => {
      const sku = n.getAttribute("data-sku") ?? "";
      const priceText = n.querySelector(".p-price i")?.textContent ?? "";
      const title = (n.querySelector(".p-name em")?.textContent ?? "").trim();
      const href = n.querySelector<HTMLAnchorElement>(".p-name a")?.href ?? "";
      const img = n.querySelector<HTMLImageElement>(".p-img img");
      const imgSrc =
        img?.getAttribute("src") || img?.getAttribute("data-lazy-img") || "";
      const shop = (n.querySelector(".p-shop a")?.textContent ?? "").trim();
      const commit = (n.querySelector(".p-commit a")?.textContent ?? "").trim();
      return { sku, priceText, title, href, imgSrc, shop, commit };
    }),
  );

  const out: NormalizedListing[] = [];
  for (const it of items) {
    const price = parsePrice(it.priceText);
    if (!it.sku || !it.title || price === null) continue;
    const soldM = it.commit.match(/(\d+(?:\.\d+)?)(万)?/);
    const soldCount = soldM
      ? Math.round(parseFloat(soldM[1]) * (soldM[2] ? 10000 : 1))
      : undefined;
    out.push({
      platform: "JD",
      itemId: it.sku,
      url: it.href || `https://item.jd.com/${it.sku}.html`,
      title: it.title,
      price,
      currency: "CNY",
      imageUrl: it.imgSrc
        ? it.imgSrc.startsWith("//")
          ? `https:${it.imgSrc}`
          : it.imgSrc
        : undefined,
      shopName: it.shop || undefined,
      soldCount,
    });
  }
  return out;
}

function assertNotBlocked(page: Page) {
  const url = page.url();
  if (url.includes("passport.jd.com")) {
    throw new CrawlError("LOGIN_WALL", "JD redirected to passport login (rate pressure)");
  }
  if (url.includes("captcha") || url.includes("verify")) {
    throw new CrawlError("CAPTCHA", `JD verification page: ${url}`);
  }
}

export function createJdAdapter(): PlatformAdapter {
  return {
    platform: "JD",
    requiresLogin: false,
    async searchProducts(keyword, opts) {
      const ctx = await openPlatformContext("JD");
      try {
        const page = await ctx.newPage();
        const all: NormalizedListing[] = [];
        for (let p = 1; p <= MAX_PAGES; p++) {
          const url = `https://search.jd.com/Search?keyword=${encodeURIComponent(keyword)}&enc=utf-8&page=${p * 2 - 1}`;
          await withTimeout(
            page.goto(url, { waitUntil: "domcontentloaded" }).then(() => {}),
            45000,
            "JD search navigation",
          );
          assertNotBlocked(page);
          await page
            .waitForSelector("#J_goodsList .gl-item", { timeout: 15000 })
            .catch(() => {
              assertNotBlocked(page);
              throw new CrawlError("TIMEOUT", "JD result grid did not render");
            });
          all.push(...(await extractPage(page)));
          if (all.length >= (opts?.maxResults ?? 90)) break;
          await randomDelay();
        }
        // dedupe by sku (paging can overlap)
        const seen = new Set<string>();
        return all
          .filter((l) => (seen.has(l.itemId) ? false : (seen.add(l.itemId), true)))
          .slice(0, opts?.maxResults ?? 90);
      } finally {
        await closeQuietly(ctx);
      }
    },
    async fetchDetail(itemId) {
      const ctx = await openPlatformContext("JD");
      try {
        const page = await ctx.newPage();
        await page.goto(`https://item.jd.com/${itemId}.html`, {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        });
        assertNotBlocked(page);
        const priceText = await page
          .locator(".price, .p-price .price")
          .first()
          .textContent({ timeout: 15000 })
          .catch(() => null);
        const title = await page
          .locator(".sku-name, .itemInfo-wrap .sku-name")
          .first()
          .textContent({ timeout: 5000 })
          .catch(() => null);
        const price = priceText ? parsePrice(priceText) : null;
        if (price === null || !title) {
          const body = await page.locator("body").textContent({ timeout: 5000 }).catch(() => null);
          return unreadableDetail("JD", itemId, body);
        }
        return {
          platform: "JD",
          itemId,
          url: `https://item.jd.com/${itemId}.html`,
          title: title.trim(),
          price,
          currency: "CNY",
        };
      } finally {
        await closeQuietly(ctx);
      }
    },
  };
}
