import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());

// [label, search URL, link selector for the first product]
const T: [string, string, string][] = [
  ["ROLEX-HK", "https://www.rolex.com/en-hk/watches/submariner/m126610ln-0001", ""],
  ["TUDOR-prod", "https://www.tudorwatch.com/en/watches/black-bay-58/m79030n-0001-fabric", ""],
  ["OMEGA-JP", "https://www.omegawatches.com/ja-jp/search?q=210.30.42.20.01.001", "a[href*='/watch-omega']"],
  ["OMEGA-US", "https://www.omegawatches.com/en-us/search?q=210.30.42.20.01.001", "a[href*='/watch-omega']"],
  ["CARTIER-HK", "https://www.cartier.com/en-hk/search?q=love%20bracelet", "a[href*='/love-bracelet']"],
  ["LV-HK", "https://hk.louisvuitton.com/eng-hk/search/neverfull", "a[href*='/products/']"],
  ["GUCCI-HK", "https://www.gucci.com/hk/en_gb/search?searchString=marmont", "a[href*='/pr/']"],
  ["TIFFANY-HK", "https://www.tiffany.com.hk/search?q=tiffany+t+wire+bracelet", "a[href*='/jewelry/']"],
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ locale: "en-HK", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" });
  for (const [name, url, sel] of T) {
    const page = await ctx.newPage();
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(3000);
      let target = url;
      if (sel) {
        const href = await page.$eval(sel, (a) => (a as HTMLAnchorElement).href).catch(() => null);
        if (href) {
          target = href;
          await page.goto(href, { waitUntil: "domcontentloaded", timeout: 45000 });
          await page.waitForTimeout(3000);
        } else {
          console.log(`${name} | status ${res?.status()} | search page: no product link (${sel})`);
          await page.close();
          continue;
        }
      }
      const ld = await page.$$eval('script[type="application/ld+json"]', (n) => n.map((x) => x.textContent ?? "").join(" ")).catch(() => "");
      const ldPrice = /"price"\s*:\s*"?([\d.,]+)"?/.exec(ld)?.[1];
      const ldCur = /"priceCurrency"\s*:\s*"([A-Z]{3})"/.exec(ld)?.[1];
      const body = await page.innerText("body").catch(() => "");
      const visible = /(HK\$|US\$|£|€|JPY|¥|HKD|USD)\s?[\d][\d,.]{2,}/.exec(body)?.[0];
      console.log(`${name} | ${res?.status()} | ld=${ldPrice ?? "-"} ${ldCur ?? ""} | visible=${visible ?? "-"} | ${target.slice(0, 70)}`);
    } catch (e) {
      console.log(`${name} | FAILED ${(e as Error).message.slice(0, 80)}`);
    }
    await page.close();
  }
  await browser.close();
}
main();
