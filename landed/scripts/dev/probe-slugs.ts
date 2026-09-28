import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());
const FAMILIES = ["submariner", "gmt-master-ii", "datejust", "oyster-perpetual"];
async function main() {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" });
  const page = await ctx.newPage();
  for (const f of FAMILIES) {
    await page.goto(`https://www.rolex.com/en-hk/watches/${f}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);
    const links = await page.$$eval("a[href*='/watches/']", (as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""));
    const slugs = [...new Set(links.filter((h) => /\/m[0-9a-z]+-\d{4}$/.test(h)).map((h) => h.split("/").pop()!))];
    console.log(`${f}: ${slugs.slice(0, 12).join(" ")}`);
  }
  await b.close();
}
main();
