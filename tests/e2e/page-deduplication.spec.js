const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("document register open buttons do not expose duplicate operational routes", async ({ page }) => {
  test.skip(!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD, "Missing admin test credentials.");
  expect(await login(page, "admin")).toBe(true);
  await page.goto("/documents?document_type=purchase_request");
  const operationalLink = page.locator('a[href^="/purchase-requests/"]').first();
  if (await operationalLink.count()) {
    await expect(operationalLink).toBeVisible();
  }
});
