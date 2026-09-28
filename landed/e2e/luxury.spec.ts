import { expect, test } from "@playwright/test";

// Needs OFFICIAL_SYNC to have run (brand boutique prices).
test("luxury page leads with official boutique prices per market", async ({ page }) => {
  await page.goto("/luxury");
  await expect(page.getByRole("heading", { name: /官方定價 Official boutique prices/ })).toBeVisible();
  await expect(page.getByText(/Ref\. 126610LN/).first()).toBeVisible();
  // Market rows carry the tax rule, not just a converted number.
  await expect(page.getByText(/UK tourist VAT refunds were abolished/).first()).toBeVisible();
  await expect(page.getByText(/does not publish handbag prices online/).first()).toBeVisible();
});
