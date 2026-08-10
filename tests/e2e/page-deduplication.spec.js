const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("document register keeps its row action in the final column", async ({ page }) => {
  test.skip(!process.env.TEST_PURCHASING_EMAIL || !process.env.TEST_PURCHASING_PASSWORD, "Missing Purchasing test credentials.");
  expect(await login(page, "purchasing")).toBe(true);
  await page.goto("/documents?document_type=purchase_request");
  // The canonical register keeps the row action in the first column so it
  // remains discoverable while the identity columns stay sticky.
  await expect(page.locator("table thead th").first()).toHaveText(/action/i);
  await expect(page.locator('table a', { hasText: /^Open$/ })).toHaveCount(0);
  const rows = page.locator("tbody tr[data-href]");
  if (await rows.count()) await expect(rows.first().locator('td:first-child a[aria-label^="Open"]')).toBeAttached();
});
