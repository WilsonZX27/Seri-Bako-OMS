const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("dashboard responds within smoke threshold", async ({ page }) => {
  test.skip(!process.env.TEST_PURCHASING_EMAIL || !process.env.TEST_PURCHASING_PASSWORD, "Missing Purchasing test credentials.");
  expect(await login(page, "purchasing")).toBe(true);
  const started = Date.now();
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  expect(Date.now() - started).toBeLessThan(8000);
});
