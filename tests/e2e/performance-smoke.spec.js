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
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Purchasing", { exact: true }).first()).toBeVisible();
  const durationMs = Date.now() - started;
  console.log(`[production-smoke] dashboard ready in ${durationMs}ms`);
  expect(durationMs).toBeLessThan(8000);
});
