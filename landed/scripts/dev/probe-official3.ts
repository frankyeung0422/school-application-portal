import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());
const T: [string, string][] = [
  ["ROLEX en-hk", "https://www.rolex.com/en-hk/watches/submariner/m126610ln-0001"],
  ["ROLEX ja-jp", "https://www.rolex.com/ja-jp/watches/submariner/m126610ln-0001"],
  ["ROLEX en-gb", "https://www.rolex.com/en-gb/watches/submariner/m126610ln-0001"],
  ["ROLEX en-us", "https://www.rolex.com/en-us/watches/submariner/m126610ln-0001"],
  ["ROLEX en-sg", "https://www.rolex.com/en-sg/watches/submariner/m126610ln-0001"],
  ["OMEGA en-hk", "https://www.omegawatches.com/en-hk/watch-omega-seamaster-diver-300m-21030422001001"],
  ["OMEGA ja-jp", "https://www.omegawatches.com/ja-jp/watch-omega-seamaster-diver-300m-21030422001001"],
  ["OMEGA en-gb", "https://www.omegawatches.com/en-gb/watch-omega-seamaster-diver-300m-21030422001001"],
  ["OMEGA en-us", "https://www.omegawatches.com/en-us/watch-omega-seamaster-diver-300m-21030422001001"],
];
async function main() {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" });
  for (const [name, url] of T) {
    const p = await ctx.newPage();
    try {
      const res = await p.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await p.waitForTimeout(2500);
      const ld = await p.$$eval('script[type="application/ld+json"]', (n) => n.map((x) => x.textContent ?? "").join(" ")).catch(() => "");
      const price = /"price"\s*:\s*"?([\d.,]+)"?/.exec(ld)?.[1];
      const cur = /"priceCurrency"\s*:\s*"([A-Z]{3})"/.exec(ld)?.[1];
      console.log(`${name} | ${res?.status()} | ${price ?? "-"} ${cur ?? ""}`);
    } catch (e) {
      console.log(`${name} | FAILED ${(e as Error).message.slice(0, 60)}`);
    }
    await p.close();
  }
  await b.close();
}
main();
