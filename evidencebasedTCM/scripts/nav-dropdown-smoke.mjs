import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:4343";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(base, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(1500);

  const triggers = page.locator("header nav button[aria-haspopup='menu']");
  const n = await triggers.count();
  if (n < 3) {
    console.error(`Expected at least 3 nav dropdown triggers, found ${n}`);
    process.exitCode = 1;
    await browser.close();
    return;
  }

  for (let i = 0; i < 3; i++) {
    await triggers.nth(i).click({ timeout: 5000 });
    const menu = page.locator("header [role='menu']").first();
    await menu.waitFor({ state: "visible", timeout: 3000 });
    const linkCount = await menu.getByRole("menuitem").count();
    if (linkCount < 1) {
      console.error(`Menu ${i + 1}: expected menu items, got ${linkCount}`);
      process.exitCode = 1;
      break;
    }
    await page
      .locator('[role="presentation"].fixed.inset-0')
      .first()
      .click({ position: { x: 100, y: 400 } });
    await menu.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
  }

  if (errors.length) {
    console.error("Page errors:", errors);
    process.exitCode = 1;
  }

  await browser.close();
  if (!process.exitCode) console.log("nav-dropdown-smoke: OK");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
