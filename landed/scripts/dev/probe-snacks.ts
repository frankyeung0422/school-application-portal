import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());
const T: [string, string][] = [
  ["AJI", "https://www.ajiichiban.com.hk"],
  ["BESTMART", "https://www.bestmart360.com"],
  ["759", "https://www.759store.com"],
];
async function main() {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ locale: "zh-HK", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" });
  for (const [name, url] of T) {
    const p = await ctx.newPage();
    try {
      const res = await p.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await p.waitForTimeout(3500);
      const text = await p.innerText("body").catch(() => "");
      const prices = text.match(/(HK\$|\$)\s?\d+(\.\d+)?/g)?.slice(0, 6) ?? [];
      const links = await p.$$eval("a[href]", (as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? "").filter((h) => /product|shop|item|goods|collection|category/i.test(h)).slice(0, 8));
      const gen = await p.$eval("meta[name='generator']", (m) => m.getAttribute("content")).catch(() => null);
      console.log(`${name} | ${res?.status()} | title="${(await p.title()).slice(0, 40)}" | generator=${gen} | prices=${prices.join(",")} | links=${[...new Set(links)].slice(0, 5).join(" ")}`);
    } catch (e) {
      console.log(`${name} | FAILED ${(e as Error).message.slice(0, 70)}`);
    }
    await p.close();
  }
  await b.close();
}
main();
