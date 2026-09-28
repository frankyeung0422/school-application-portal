import type { Page, Response } from "playwright";
import { prisma } from "../../prisma";
import { closeQuietly, openPlatformContext } from "../browser";
import { randomDelay, withTimeout } from "../rate-limit";
import { CrawlError, type NormalizedListing, type PlatformAdapter } from "../types";

// Taobao search DOM is obfuscated and the mtop API requires a page-computed
// `sign`; intercepting the search JSON responses the page itself fetches
// sidesteps both. Requires a logged-in persistent profile (npm run login -- taobao).

const SEARCH_API_MARKERS = [
  "mtop.relationrecommend.wirelessrecommend.recommend",
  "mtop.taobao.search",
];

interface MtopItem {
  item_id?: string | number;
  nid?: string | number;
  title?: string;
  price?: string | number;
  priceShow?: { price?: string };
  pic_path?: string;
  picPath?: string;
  nick?: string;
  shopInfo?: { title?: string };
  realSales?: string;
  auctionURL?: string;
}

function collectItems(obj: unknown, out: MtopItem[]) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const x of obj) collectItems(x, out);
    return;
  }
  const rec = obj as Record<string, unknown>;
  const hasId = rec.item_id !== undefined || rec.nid !== undefined;
  const hasTitle = typeof rec.title === "string";
  const hasPrice =
    rec.price !== undefined ||
    (rec.priceShow && typeof rec.priceShow === "object");
  if (hasId && hasTitle && hasPrice) {
    out.push(rec as MtopItem);
    return;
  }
  for (const v of Object.values(rec)) collectItems(v, out);
}

function toListing(item: MtopItem): NormalizedListing | null {
  const itemId = String(item.item_id ?? item.nid ?? "");
  const title = (item.title ?? "").replace(/<[^>]+>/g, "").trim();
  const priceRaw = item.priceShow?.price ?? item.price;
  const price = priceRaw !== undefined ? parseFloat(String(priceRaw)) : NaN;
  if (!itemId || !title || !Number.isFinite(price)) return null;
  const pic = item.pic_path ?? item.picPath;
  const salesM = String(item.realSales ?? "").match(/(\d+(?:\.\d+)?)(万)?/);
  return {
    platform: "TAOBAO",
    itemId,
    url:
      item.auctionURL && item.auctionURL.startsWith("http")
        ? item.auctionURL
        : `https://item.taobao.com/item.htm?id=${itemId}`,
    title,
    price,
    currency: "CNY",
    imageUrl: pic ? (pic.startsWith("//") ? `https:${pic}` : pic) : undefined,
    shopName: item.nick ?? item.shopInfo?.title ?? undefined,
    soldCount: salesM
      ? Math.round(parseFloat(salesM[1]) * (salesM[2] ? 10000 : 1))
      : undefined,
  };
}

async function assertNotBlocked(page: Page) {
  const url = page.url();
  if (url.includes("login.taobao.com") || url.includes("login.tmall.com")) {
    await prisma.platformSession.updateMany({
      where: { platform: "TAOBAO" },
      data: { status: "EXPIRED", lastCheckedAt: new Date() },
    });
    throw new CrawlError("LOGIN_WALL", "Taobao redirected to login");
  }
  if (url.includes("punish") || url.includes("captcha")) {
    throw new CrawlError("CAPTCHA", `Taobao anti-bot page: ${url}`);
  }
}

export function createTaobaoAdapter(): PlatformAdapter {
  return {
    platform: "TAOBAO",
    requiresLogin: true,
    async searchProducts(keyword, opts) {
      const ctx = await openPlatformContext("TAOBAO");
      try {
        const page = await ctx.newPage();
        const captured: MtopItem[] = [];

        const onResponse = async (res: Response) => {
          const url = res.url();
          if (!SEARCH_API_MARKERS.some((m) => url.includes(m))) return;
          try {
            const text = await res.text();
            // mtop responses are jsonp-wrapped: mtopjsonp1({...})
            const jsonText = text.replace(/^[^(]*\(/, "").replace(/\)\s*$/, "");
            collectItems(JSON.parse(jsonText), captured);
          } catch {
            // non-JSON or truncated body — ignore
          }
        };
        page.on("response", onResponse);

        await withTimeout(
          page
            .goto(`https://s.taobao.com/search?q=${encodeURIComponent(keyword)}`, {
              waitUntil: "domcontentloaded",
            })
            .then(() => {}),
          60000,
          "Taobao search navigation",
        );
        await page.waitForTimeout(5000);
        await assertNotBlocked(page);

        // scroll to trigger further result batches (stay under 2 "pages")
        for (let i = 0; i < 6 && captured.length < (opts?.maxResults ?? 90); i++) {
          await page.mouse.wheel(0, 1800);
          await page.waitForTimeout(1200);
        }
        await assertNotBlocked(page);
        page.off("response", onResponse);

        const seen = new Set<string>();
        const listings: NormalizedListing[] = [];
        for (const item of captured) {
          const l = toListing(item);
          if (l && !seen.has(l.itemId)) {
            seen.add(l.itemId);
            listings.push(l);
          }
        }
        if (listings.length === 0) {
          throw new CrawlError(
            "TIMEOUT",
            "No Taobao search JSON captured (login expired, captcha, or API shape change)",
          );
        }
        await randomDelay(3000, 8000);
        return listings.slice(0, opts?.maxResults ?? 90);
      } finally {
        await closeQuietly(ctx);
      }
    },
    async checkLogin() {
      const ctx = await openPlatformContext("TAOBAO");
      try {
        const page = await ctx.newPage();
        await page.goto("https://i.taobao.com/my_taobao.htm", {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        });
        await page.waitForTimeout(3000);
        const loggedIn = !page.url().includes("login");
        await prisma.platformSession.updateMany({
          where: { platform: "TAOBAO" },
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
  };
}
