import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());
async function main() {
  const b = await chromium.launch({ headless: true });
  const p = await (await b.newContext({ locale: "zh-HK", userAgent: "Mozilla/5.0 Chrome/131.0" })).newPage();
  for (const url of ["https://www.759store.com/shop.php", "https://www.759store.com/product.php", "https://shop.759store.com"]) {
    try {
      const res = await p.goto(url, { waitUntil: "networkidle", timeout: 40000 });
      const text = await p.innerText("body").catch(() => "");
      console.log(`${url} | ${res?.status()} | ${text.replace(/\s+/g, " ").slice(0, 160)} | prices=${(text.match(/\$\s?\d+(\.\d+)?/g) ?? []).slice(0, 5).join(",")}`);
    } catch (e) {
      console.log(`${url} | FAILED ${(e as Error).message.slice(0, 60)}`);
    }
  }
  await b.close();
}
main();
