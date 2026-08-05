const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("dashboard responds within smoke threshold", async ({ page }) => {
  test.skip(!process.env.TEST_PURCHASING_EMAIL || !process.env.TEST_PURCHASING_PASSWORD, "Missing Purchasing test credentials.");
  expect(await login(page, "purchasing")).toBe(true);
  await page.waitForLoadState("networkidle");
  const started = Date.now();
  const response = await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  expect(response?.ok()).toBe(true);
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  await expect(page.getByRole("heading", { name: /Workdesk$/ })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(8000);
});
