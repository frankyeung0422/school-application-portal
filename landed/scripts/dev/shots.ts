import { chromium } from "playwright";
const OUT = process.argv[2];
const B = "http://localhost:6565";
async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${page.url()}: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  const shot = async (path: string, name: string, full = true) => {
    await page.goto(B + path, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  };
  await shot("/", "home");
  await shot("/p/redmi-buds-6-4", "product-buds");
  await shot("/search?q=demo", "search");
  // log in as admin through the real form
  await page.goto(B + "/login?next=/admin");
  await page.fill("#email", "admin@landed.local");
  await page.fill("#password", "landed-admin-2026");
  await page.click("button[type=submit], form button");
  await page.waitForURL("**/admin", { timeout: 20000 });
  await shot("/admin", "admin-dashboard");
  await shot("/admin/actions", "admin-actions");
  await shot("/admin/products/4", "admin-product");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("/p/redmi-buds-6-4", "mobile-product", true);
  console.log(errors.length ? errors.join("\n") : "no console errors");
  await browser.close();
}
main();
