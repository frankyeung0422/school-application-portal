import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());
async function main() {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ locale: "zh-HK", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" });
  const p = await ctx.newPage();
  for (const url of ["https://www.bestmart360.com/cat", "https://www.bestmart360.com/new-product", "https://www.759store.com/shop.php"]) {
    try {
      const res = await p.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await p.waitForTimeout(3500);
      const text = await p.innerText("body").catch(() => "");
      const cards = await p.$$eval("a[href*='product_id'], a[href*='product'], .product, .item", (els) => els.slice(0, 5).map((e) => (e as HTMLElement).innerText.replace(/\s+/g, " ").slice(0, 80)));
      console.log(`\n${url} | ${res?.status()} | body ${text.length}B`);
      console.log("  sample cards:", JSON.stringify(cards.slice(0, 5)));
      const prices = text.match(/\$\s?\d+(\.\d+)?/g)?.slice(0, 8) ?? [];
      console.log("  prices:", prices.join(" "));
    } catch (e) {
      console.log(`${url} FAILED ${(e as Error).message.slice(0, 70)}`);
    }
  }
  await b.close();
}
main();
