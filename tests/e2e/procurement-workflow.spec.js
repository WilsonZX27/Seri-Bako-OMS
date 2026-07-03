const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("manager can open manager approval queue", async ({ page }) => {
  test.skip(!process.env.TEST_MANAGER_EMAIL || !process.env.TEST_MANAGER_PASSWORD, "Missing manager test credentials.");
  expect(await login(page, "manager")).toBe(true);
  await page.goto("/purchase-requests?status=pending_approval");
  await expect(page.getByText(/purchase requests/i)).toBeVisible();
});

test("purchasing can open purchasing review queue", async ({ page }) => {
  test.skip(!process.env.TEST_PURCHASE_EMAIL || !process.env.TEST_PURCHASE_PASSWORD, "Missing purchasing test credentials.");
  expect(await login(page, "purchasing")).toBe(true);
  await page.goto("/purchase-requests?status=purchasing_review");
  await expect(page.getByText(/purchase requests/i)).toBeVisible();
});
