import { expect, test } from "@playwright/test";

// Needs the Price Watch feed synced into dev.db (worker SUPERMARKET_SYNC or scripts/dev/sync-now.ts).
test("supermarket list → add to basket → basket names the cheapest shop", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/supermarket?q=" + encodeURIComponent("維他奶"));
  await expect(page.getByText(/消費者委員會/).first()).toBeVisible();
  const add = page.getByRole("button", { name: /加入清單/ });
  await add.nth(0).click();
  await add.nth(1).click();
  await page.getByRole("link", { name: /購物清單/ }).first().click();
  await expect(page.getByText(/分開買最平 Cheapest split/)).toBeVisible();
  await expect(page.getByText(/HK\$\d+\.\d{2}/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("search shows HK supermarket results alongside marketplaces", async ({ page }) => {
  await page.goto("/search?q=Colgate");
  await expect(page.getByRole("heading", { name: /香港超市/ })).toBeVisible();
});
