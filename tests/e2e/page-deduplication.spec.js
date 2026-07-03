const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("document register rows open records without desktop open button column", async ({ page }) => {
  test.skip(!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD, "Missing admin test credentials.");
  expect(await login(page, "admin")).toBe(true);
  await page.goto("/documents?document_type=purchase_request");
  await expect(page.locator("table thead")).not.toContainText(/action/i);
  await expect(page.locator('table a', { hasText: /^Open$/ })).toHaveCount(0);
  await expect(page.locator('table a[aria-label^="Quick view"]').first()).toBeAttached();
});
