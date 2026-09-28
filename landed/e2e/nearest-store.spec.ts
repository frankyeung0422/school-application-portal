import { expect, test } from "@playwright/test";

// Needs STORE_SYNC to have run (OpenStreetMap shop locations).
test.use({ geolocation: { latitude: 22.2819, longitude: 114.1583 }, permissions: ["geolocation"] });

test("hovering the cheapest price offers the nearest branch of that chain", async ({ page }) => {
  await page.goto("/supermarket?q=" + encodeURIComponent("維他奶"));
  const price = page.locator("button.cursor-help").first();
  await price.hover();
  // Location is never requested by hover alone — it offers first.
  await expect(page.getByText(/最近分店/).first()).toBeVisible();
  await price.click();
  await expect(page.getByText(/步行約 \d+ 分鐘/).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/OpenStreetMap/).first()).toBeVisible();
});
