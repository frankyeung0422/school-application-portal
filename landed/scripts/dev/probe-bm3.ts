import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());
async function main() {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ locale: "zh-HK", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" });
  const p = await ctx.newPage();
  p.on("request", (r) => {
    if (r.url().includes("getList")) console.log("REQ", r.method(), r.url(), "| post:", (r.postData() ?? "").slice(0, 200));
  });
  p.on("response", async (r) => {
    if (r.url().includes("getList")) {
      const txt = await r.text().catch(() => "");
      console.log("RESP", r.status(), txt.slice(0, 700));
    }
  });
  await p.goto("https://www.bestmart360.com/cat?product_id=2205", { waitUntil: "networkidle", timeout: 60000 });
  await p.waitForTimeout(2500);
  await b.close();
}
main();
