import { chromium } from "playwright";
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1280, height: 1000 }, locale: "zh-HK" })).newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:6565/instore", { waitUntil: "networkidle" });
  await page.selectOption("#rp-retailer", "AJI");
  await page.fill("#rp-price", "19.8");
  await page.fill("#rp-item", "優之良品 芒果乾 100g");
  await page.fill("#rp-branch", "旺角登打士街");
  // A 1x1 PNG stands in for a photo of the shelf tag.
  await page.setInputFiles("#rp-photo", {
    name: "tag.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
  });
  await page.getByRole("button", { name: /提交 Submit/ }).click();
  await page.waitForSelector("text=/多謝|出錯|錯/", { timeout: 15000 });
  const msg = await page.locator("form span.text-xs").last().innerText();
  console.log("submit result:", msg.slice(0, 120));
  await page.screenshot({ path: `${OUT}/instore-form.png`, fullPage: false });
  console.log(errors.length ? "ERRORS: " + errors.join("; ") : "no page errors");
  await b.close();
})();
