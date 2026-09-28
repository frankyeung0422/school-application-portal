import type { Page } from "playwright";
import { prisma } from "../../prisma";
import type { PriceTier } from "../../types";
import { closeQuietly, openPlatformContext } from "../browser";
import { randomDelay, withTimeout } from "../rate-limit";
import { CrawlError, type NormalizedListing, type PlatformAdapter } from "../types";
import { unreadableDetail } from "../detail";

function parsePrice(text: string): number | null {
  const m = text.replace(/[,¥￥\s]/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

async function assertNotBlocked(page: Page) {
  const url = page.url();
  if (url.includes("login.1688.com") || url.includes("login.taobao.com")) {
    await prisma.platformSession.updateMany({
      where: { platform: "ALI1688" },
      data: { status: "EXPIRED", lastCheckedAt: new Date() },
    });
    throw new CrawlError("LOGIN_WALL", "1688 redirected to login");
  }
  if (url.includes("punish") || url.includes("captcha")) {
    throw new CrawlError("CAPTCHA", `1688 anti-bot page: ${url}`);
  }
}

// 1688's offer-search markup shifts between campaigns; extract defensively
// from card-level anchors rather than one exact class set.
async function extractOffers(page: Page): Promise<NormalizedListing[]> {
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(700);
  }
  const raw = await page.evaluate(() => {
    const cards = Array.from(
      document.querySelectorAll(
        '[class*="offer-card"], [class*="card-container"], .space-offer-card-box, [data-offer-id]',
      ),
    );
    return cards.map((card) => {
      const link = card.querySelector<HTMLAnchorElement>(
        'a[href*="detail.1688.com/offer"]',
      );
      const href = link?.href ?? "";
      const idMatch = href.match(/offer\/(\d+)\.html/);
      const title =
        (card.querySelector('[class*="title"]')?.textContent ?? "").trim() ||
        (link?.title ?? "").trim() ||
        (link?.textContent ?? "").trim();
      const priceText = (
        card.querySelector('[class*="price"]')?.textContent ?? ""
      ).trim();
      const img = card.querySelector<HTMLImageElement>("img");
      const imgSrc = img?.getAttribute("src") ?? "";
      const cardText = (card.textContent ?? "").replace(/\s+/g, " ");
      // "2件起批" / "≥2件"
      const moqMatch = cardText.match(/(?:≥|>=)?\s*(\d+)\s*[件个套双盒包]?\s*起批/);
      const shop = (
        card.querySelector('[class*="company"], [class*="shop"]')?.textContent ??
        ""
      ).trim();
      const soldMatch = cardText.match(/已售\s*(\d+(?:\.\d+)?)(万)?/);
      return {
        href,
        offerId: idMatch ? idMatch[1] : "",
        title,
        priceText,
        imgSrc,
        moq: moqMatch ? parseInt(moqMatch[1], 10) : null,
        shop,
        sold: soldMatch
          ? Math.round(parseFloat(soldMatch[1]) * (soldMatch[2] ? 10000 : 1))
          : null,
      };
    });
  });

  const out: NormalizedListing[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (!r.offerId || !r.title || seen.has(r.offerId)) continue;
    const price = parsePrice(r.priceText);
    if (price === null) continue;
    seen.add(r.offerId);
    out.push({
      platform: "ALI1688",
      itemId: r.offerId,
      url: `https://detail.1688.com/offer/${r.offerId}.html`,
      title: r.title,
      price,
      currency: "CNY",
      imageUrl: r.imgSrc
        ? r.imgSrc.startsWith("//")
          ? `https:${r.imgSrc}`
          : r.imgSrc
        : undefined,
      shopName: r.shop || undefined,
      soldCount: r.sold ?? undefined,
      moq: r.moq ?? undefined,
    });
  }
  return out;
}

export function createAli1688Adapter(): PlatformAdapter {
  return {
    platform: "ALI1688",
    requiresLogin: true,
    async searchProducts(keyword, opts) {
      const ctx = await openPlatformContext("ALI1688");
      try {
        const page = await ctx.newPage();
        const url = `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(keyword)}`;
        await withTimeout(
          page.goto(url, { waitUntil: "domcontentloaded" }).then(() => {}),
          60000,
          "1688 search navigation",
        );
        await page.waitForTimeout(3000);
        await assertNotBlocked(page);
        const listings = await extractOffers(page);
        if (listings.length === 0) {
          await assertNotBlocked(page);
          throw new CrawlError("TIMEOUT", "1688 offer cards not found (layout change or soft block)");
        }
        await randomDelay();
        return listings.slice(0, opts?.maxResults ?? 90);
      } finally {
        await closeQuietly(ctx);
      }
    },
    async checkLogin() {
      const ctx = await openPlatformContext("ALI1688");
      try {
        const page = await ctx.newPage();
        await page.goto("https://work.1688.com/", {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        });
        await page.waitForTimeout(3000);
        const loggedIn = !page.url().includes("login");
        await prisma.platformSession.updateMany({
          where: { platform: "ALI1688" },
          data: {
            status: loggedIn ? "LOGGED_IN" : "EXPIRED",
            lastCheckedAt: new Date(),
          },
        });
        return loggedIn;
      } finally {
        await closeQuietly(ctx);
      }
    },
    async fetchDetail(itemId) {
      const ctx = await openPlatformContext("ALI1688");
      try {
        const page = await ctx.newPage();
        await page.goto(`https://detail.1688.com/offer/${itemId}.html`, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        await page.waitForTimeout(3000);
        await assertNotBlocked(page);

        const detail = await page.evaluate(() => {
          const title = (
            document.querySelector('[class*="title-text"], h1')?.textContent ?? ""
          ).trim();
          // price-tier table: ranges like "2-9件 ¥145  10-49件 ¥138  ≥50件 ¥129"
          const tierNodes = Array.from(
            document.querySelectorAll('[class*="price-item"], [class*="ladder"]'),
          );
          const tiers = tierNodes
            .map((n) => {
              const text = (n.textContent ?? "").replace(/\s+/g, " ");
              const qty = text.match(/(?:≥|>=)?\s*(\d+)/);
              const price = text.match(/[¥￥]\s*(\d+(?:\.\d+)?)/);
              return qty && price
                ? { minQty: parseInt(qty[1], 10), price: parseFloat(price[1]) }
                : null;
            })
            .filter((x): x is { minQty: number; price: number } => x !== null);
          const priceText = (
            document.querySelector('[class*="price"]')?.textContent ?? ""
          ).trim();
          return { title, tiers, priceText, body: (document.body.textContent ?? "").replace(/\s+/g, " ").slice(0, 4000) };
        });

        const tiers: PriceTier[] = detail.tiers;
        const price =
          tiers.length > 0
            ? tiers[0].price
            : (parsePrice(detail.priceText) ?? null);
        if (!detail.title || price === null) return unreadableDetail("1688", itemId, detail.body);
        const moq = tiers.length > 0 ? Math.min(...tiers.map((t) => t.minQty)) : undefined;
        return {
          platform: "ALI1688",
          itemId,
          url: `https://detail.1688.com/offer/${itemId}.html`,
          title: detail.title,
          price,
          currency: "CNY",
          moq,
          priceTiers: tiers.length > 0 ? tiers : undefined,
        };
      } finally {
        await closeQuietly(ctx);
      }
    },
  };
}
