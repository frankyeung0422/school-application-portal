/**
 * Auto-generate marketing screenshots for the Week 1 LinkedIn campaign.
 *
 * Prerequisite: dev server must be running on http://localhost:4343
 *
 * Usage:
 *   1. In one terminal: npm run dev
 *   2. In another:      npx tsx scripts/screenshot-marketing.ts
 *
 * Outputs:
 *   marketing/week-1/images/01-checker-danshen-warfarin.png   (1200×627 — Monday post image A)
 *   marketing/week-1/images/02-checker-empty.png              (clean empty state)
 *   marketing/week-1/images/03-cheatsheet-landing.png         (landing page hero)
 *   marketing/week-1/images/04-cheatsheet-preview-page1.png   (the printable cover)
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.MARKETING_BASE ?? "http://localhost:4343";
const OUT_DIR = path.join(process.cwd(), "marketing", "week-1", "images");

async function ensureDir(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
}

async function withBrowser<T>(fn: (page: import("playwright").Page) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 2, // 2× for crisp screenshots
      locale: "zh-HK",
    });
    const page = await ctx.newPage();
    return await fn(page);
  } finally {
    await browser.close();
  }
}

async function checkServer(): Promise<boolean> {
  try {
    const res = await fetch(BASE);
    return res.ok;
  } catch {
    return false;
  }
}

async function screenshotInteractionChecker(): Promise<void> {
  console.log("  → /interactions with 丹參 × Warfarin populated");
  await withBrowser(async (page) => {
    await page.goto(`${BASE}/interactions`, { waitUntil: "networkidle" });

    // Empty state screenshot first (just the form area).
    await page.screenshot({
      path: path.join(OUT_DIR, "02-checker-empty.png"),
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });

    // Populate 丹參.
    const herbInput = page.locator('input[placeholder*="Chinese"], input[placeholder*="搜尋"]').first();
    await herbInput.click();
    await herbInput.fill("Dan Shen");
    await page.waitForTimeout(400); // debounce
    const danshenOption = page.getByRole("button").filter({ hasText: /丹參|Dan Shen/i }).first();
    await danshenOption.click();

    // Populate Warfarin.
    const drugInput = page.locator('input[placeholder*="generic"], input[placeholder*="warfarin"]').first();
    await drugInput.click();
    await drugInput.fill("warfarin");
    await page.waitForTimeout(200);
    const warfOption = page.getByRole("button").filter({ hasText: /^Warfarin/i }).first();
    await warfOption.click();

    // Wait for the debounced auto-run check (400ms in component).
    await page.waitForTimeout(1200);

    // LinkedIn share card dimensions = 1200×627. We resize the viewport to that
    // and screenshot.
    await page.setViewportSize({ width: 1200, height: 627 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(OUT_DIR, "01-checker-danshen-warfarin.png"),
      type: "png",
    });
  });
}

async function screenshotCheatsheetLanding(): Promise<void> {
  console.log("  → /cheatsheet/herb-drug-2026 landing page");
  await withBrowser(async (page) => {
    await page.setViewportSize({ width: 1200, height: 1600 });
    await page.goto(`${BASE}/cheatsheet/herb-drug-2026`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(OUT_DIR, "03-cheatsheet-landing.png"),
      fullPage: true,
    });
  });
}

async function screenshotCheatsheetPreview(): Promise<void> {
  console.log("  → /cheatsheet/herb-drug-2026/preview (cover only)");
  await withBrowser(async (page) => {
    await page.setViewportSize({ width: 900, height: 1200 });
    await page.goto(`${BASE}/cheatsheet/herb-drug-2026/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUT_DIR, "04-cheatsheet-preview-page1.png"),
      clip: { x: 0, y: 0, width: 900, height: 1200 },
    });
  });
}

async function main() {
  console.log(`[screenshot-marketing] base=${BASE}`);
  if (!(await checkServer())) {
    console.error(`\n❌ Dev server not reachable at ${BASE}`);
    console.error("   Run \"npm run dev\" in another terminal, then retry.\n");
    process.exit(1);
  }
  await ensureDir();
  console.log(`[screenshot-marketing] writing to ${OUT_DIR}\n`);

  try {
    await screenshotInteractionChecker();
  } catch (err) {
    console.log(`  ⚠ Interaction checker shot failed: ${err instanceof Error ? err.message : err}`);
    console.log("    (likely autocomplete selector mismatch — take this one manually)");
  }
  try {
    await screenshotCheatsheetLanding();
  } catch (err) {
    console.log(`  ⚠ Cheatsheet landing shot failed: ${err instanceof Error ? err.message : err}`);
  }
  try {
    await screenshotCheatsheetPreview();
  } catch (err) {
    console.log(`  ⚠ Cheatsheet preview shot failed: ${err instanceof Error ? err.message : err}`);
  }
  console.log("\n[screenshot-marketing] done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
