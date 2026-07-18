const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("purchase request list renders one bounded page", async ({ page }) => {
  test.skip(!process.env.TEST_PURCHASING_EMAIL || !process.env.TEST_PURCHASING_PASSWORD, "Missing Purchasing test credentials.");
  expect(await login(page, "purchasing")).toBe(true);
  await page.goto("/purchase-requests");
  expect(await page.locator("tbody tr").count()).toBeLessThanOrEqual(12);
  await expect(page.getByText(/Page \d+ of \d+/)).toBeVisible();
});
