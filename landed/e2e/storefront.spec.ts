import { expect, test } from "@playwright/test";

test("home → product page shows an itemised 到手價 and honest claim", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /睇到手價/ })).toBeVisible();
  await page.getByRole("link", { name: /Midea Electric Kettle 1\.5L MK-SH15/ }).first().click();
  await expect(page.getByText(/cheapest of \d+ sources checked at/)).toBeVisible();
  await page.getByText("點計 Breakdown").first().click();
  await expect(page.getByText(/合計 Total/).first()).toBeVisible();
  // The accessory decoy never appears on the kettle page.
  await expect(page.getByText("Pack of 12")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("outbound link logs and redirects only to the retailer", async ({ request }) => {
  const res = await request.get("/go/1", { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers().location).toMatch(/^https:\/\/(detail\.1688|www\.aliexpress|www\.amazon|www\.ebay|item\.jd|item\.taobao|www\.alibaba)/);
  expect((await request.get("/go/999999", { maxRedirects: 0 })).status()).toBe(404);
});

test("admin console requires admin and renders the approval gate", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin|\/login\?next=\/admin/);
  await page.fill("#email", "admin@landed.local");
  await page.fill("#password", "landed-admin-2026");
  await page.getByRole("button", { name: /登入/ }).click();
  await page.waitForURL("**/admin");
  await expect(page.getByRole("heading", { name: /總覽 Dashboard/ })).toBeVisible();
  await expect(page.getByText(/測試資金，唔計收入/)).toBeVisible();
  await page.getByRole("link", { name: /待批 Approvals/ }).click();
  await expect(page.getByText(/審計鏈/)).toBeVisible();
  await page.goto("/admin/readiness");
  await expect(page.getByText(/Live FX mids/)).toBeVisible();
});
