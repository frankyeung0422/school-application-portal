import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());
async function main() {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ locale: "zh-HK", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" });
  const p = await ctx.newPage();
  const api: string[] = [];
  p.on("response", async (r) => {
    const ct = r.headers()["content-type"] ?? "";
    if (ct.includes("json") && r.request().resourceType() !== "image") {
      const len = Number(r.headers()["content-length"] ?? 0);
      api.push(`${r.status()} ${r.url().slice(0, 120)} (${len || "?"}B)`);
    }
  });
  await p.goto("https://www.bestmart360.com/cat?product_id=2205", { waitUntil: "networkidle", timeout: 60000 });
  await p.waitForTimeout(3000);
  const text = await p.innerText("body").catch(() => "");
  console.log("PRODUCT PAGE text sample:", text.replace(/\s+/g, " ").slice(0, 300));
  console.log("prices:", (text.match(/\$\s?\d+(\.\d+)?/g) ?? []).slice(0, 6).join(" "));
  console.log("json responses:\n" + [...new Set(api)].slice(0, 12).join("\n"));
  await b.close();
}
main();
