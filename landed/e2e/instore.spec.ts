import { expect, test } from "@playwright/test";

test("a shopper can report an in-store price, and it stays private until approved", async ({ page }) => {
  await page.goto("/instore");
  await expect(page.getByText(/優之良品/).first()).toBeVisible();
  const unique = `E2E 測試貨品 ${Date.now()}`;
  await page.selectOption("#rp-retailer", "AJI");
  await page.fill("#rp-price", "12.5");
  await page.fill("#rp-item", unique);
  await page.getByRole("button", { name: /提交 Submit/ }).click();
  await expect(page.getByText(/多謝/)).toBeVisible({ timeout: 15000 });
  // Pending reports are never shown publicly.
  await page.goto("/instore?shop=AJI");
  await expect(page.getByText(unique)).toHaveCount(0);
});

test("the report form refuses a price for a shop that is not on the list", async ({ request }) => {
  const form = new FormData();
  form.set("retailer", "MY_OWN_SHOP");
  form.set("price", "10");
  form.set("itemName", "x");
  const res = await request.post("/api/instore", { multipart: { retailer: "MY_OWN_SHOP", price: "10", itemName: "x" } });
  expect(res.status()).toBe(400);
  expect((await res.json()).error).toMatch(/Pick a shop/);
});
