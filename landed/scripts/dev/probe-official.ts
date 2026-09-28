import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());

const TARGETS: [string, string][] = [
  ["OMEGA-HK", "https://www.omegawatches.com/en-hk/watch-omega-seamaster-diver-300m-21030422001001"],
  ["TUDOR", "https://www.tudorwatch.com/en/watches/black-bay-58/m79030n-0001"],
  ["CARTIER-HK", "https://www.cartier.com/en-hk/love-bracelet-CRB6035617.html"],
  ["LV-HK", "https://hk.louisvuitton.com/eng-hk/products/neverfull-mm-monogram-nvprod2360079v"],
  ["JOMALONE-HK", "https://www.jomalone.com.hk/product/25946/26993/wood-sage-sea-salt-cologne"],
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ locale: "en-HK", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" });
  for (const [name, url] of TARGETS) {
    const page = await ctx.newPage();
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(3500);
      const html = await page.content();
      const ld = await page.$$eval('script[type="application/ld+json"]', (n) => n.map((x) => x.textContent ?? "").join(" ").slice(0, 4000)).catch(() => "");
      const ldPrice = /"price"\s*:\s*"?([\d.,]+)"?/.exec(ld)?.[1];
      const ldCur = /"priceCurrency"\s*:\s*"([A-Z]{3})"/.exec(ld)?.[1];
      const visible = /(HK\$|US\$|¥|£|€|JPY|HKD)\s?[\d][\d,.]{2,}/.exec(await page.innerText("body").catch(() => ""))?.[0];
      console.log(`${name} | status ${res?.status()} | title "${(await page.title()).slice(0, 40)}" | ld:${ld.length}B price=${ldPrice ?? "-"} ${ldCur ?? ""} | visible=${visible ?? "-"} | html ${Math.round(html.length / 1024)}KB`);
    } catch (e) {
      console.log(`${name} | FAILED ${(e as Error).message.slice(0, 90)}`);
    }
    await page.close();
  }
  await browser.close();
}
main();
