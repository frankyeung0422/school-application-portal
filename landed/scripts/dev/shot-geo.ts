import { chromium } from "playwright";
const OUT = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    geolocation: { latitude: 22.2819, longitude: 114.1583 }, // Central, HK
    permissions: ["geolocation"],
    locale: "zh-HK",
  });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("http://localhost:6565/supermarket?q=" + encodeURIComponent("維他奶"), { waitUntil: "networkidle" });
  const price = page.locator("button.cursor-help").first();
  await price.hover();
  await page.waitForTimeout(400);
  await price.click();
  await page.waitForSelector("text=/米 m|公里 km|未有|冇定位/", { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/geo-hover.png`, clip: { x: 0, y: 120, width: 1280, height: 620 } });
  console.log("popup text:", (await price.locator("xpath=..").innerText()).replace(/\n+/g, " | ").slice(0, 400));
  console.log(errors.length ? "ERRORS: " + errors.join("; ") : "no console errors");
  await browser.close();
})();
