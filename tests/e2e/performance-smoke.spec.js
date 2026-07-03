const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("dashboard responds within smoke threshold", async ({ page }) => {
  test.skip(!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD, "Missing admin test credentials.");
  expect(await login(page, "admin")).toBe(true);
  const started = Date.now();
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  expect(Date.now() - started).toBeLessThan(8000);
});
