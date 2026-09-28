import { chromium } from "playwright";
const OUT = process.argv[2];
const B = "http://localhost:6565";
async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${page.url()}: ${m.text()}`); });
  await page.goto(`${B}/supermarket`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/sm-list.png`, fullPage: false });
  // add three items to the basket through the real buttons
  const buttons = page.getByRole("button", { name: /加入清單/ });
  for (let i = 0; i < 3; i++) await buttons.nth(i).click();
  await page.goto(`${B}/supermarket?q=${encodeURIComponent("維他奶")}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /加入清單/ }).first().click();
  await page.getByRole("link", { name: /維他奶/ }).first().click();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${OUT}/sm-product.png`, fullPage: true });
  await page.goto(`${B}/basket`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/sm-basket.png`, fullPage: true });
  console.log(errors.length ? errors.join("\n") : "no console errors");
  await browser.close();
}
main();
