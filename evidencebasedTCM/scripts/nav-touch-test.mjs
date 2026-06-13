import { chromium, devices } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:4343";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ...devices["iPhone 13"],
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
  });

  // Verify the served HTML actually has our class
  const html = await page.goto(base, { waitUntil: "domcontentloaded" });
  const text = await html.text();
  console.log(
    "Served HTML contains '100dvh-4rem':",
    text.includes("100dvh-4rem") ? "YES" : "NO (could be in client bundle)"
  );

  // Tap hamburger using touch
  await page.locator("header button.lg\\:hidden").first().tap();
  await page.waitForTimeout(300);

  const navMetrics = await page.locator("header nav.lg\\:hidden").evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      maxHeight: cs.maxHeight,
      overflowY: cs.overflowY,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
    };
  });
  console.log("Mobile nav computed style:", navMetrics);

  // Tap each visible top-level link with TOUCH events
  const taps = [
    { selector: 'a[href="/herbs"]', expected: "/herbs", name: "中藥 (top of menu)" },
    { selector: 'a[href="/diagnose/symptoms"]', expected: "/diagnose/symptoms", name: "辨證 (mid menu)" },
  ];

  for (const t of taps) {
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.locator("header button.lg\\:hidden").first().tap();
    await page.waitForTimeout(250);
    const link = page.locator(`header nav.lg\\:hidden ${t.selector}`).first();
    try {
      await Promise.all([
        page.waitForURL(`**${t.expected}`, { timeout: 10000 }),
        link.tap(),
      ]);
      const path = new URL(page.url()).pathname;
      console.log(`  ${path === t.expected ? "✅" : "❌"} TAP "${t.name}" → ${path}`);
    } catch (err) {
      console.log(`  ❌ TAP "${t.name}" failed: ${err.message.split("\n")[0]}`);
    }
  }

  // Also test scroll-then-tap on hidden item
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator("header button.lg\\:hidden").first().tap();
  await page.waitForTimeout(250);
  await page.locator("header nav.lg\\:hidden").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(150);
  try {
    await Promise.all([
      page.waitForURL("**/login", { timeout: 10000 }),
      page.locator('header nav.lg\\:hidden a[href="/login"]').first().tap(),
    ]);
    console.log(`  ✅ TAP "登入 (after scroll)" → ${new URL(page.url()).pathname}`);
  } catch (err) {
    console.log(`  ❌ TAP 登入 failed: ${err.message.split("\n")[0]}`);
  }

  if (errors.length) {
    console.log("\nPage errors:");
    errors.forEach((e) => console.log("  ", e));
  } else {
    console.log("\nNo page errors.");
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
