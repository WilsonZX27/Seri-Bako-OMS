const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("PR list and detail remain navigable after cached reference reads", async ({ page }) => {
  test.skip(!process.env.TEST_PURCHASING_EMAIL || !process.env.TEST_PURCHASING_PASSWORD, "Missing Purchasing test credentials.");
  expect(await login(page, "purchasing")).toBe(true);
  await page.goto("/purchase-requests");
  const record = page.locator("tbody tr a[href^='/purchase-requests/']").filter({ has: page.locator("svg") }).first();
  test.skip(!(await record.count()), "No purchase request fixture is available.");
  const href = await record.getAttribute("href");
  expect(href).toMatch(/^\/purchase-requests\/[0-9a-f-]{36}$/i);
  await record.click();
  await expect(page).toHaveURL(/\/purchase-requests\/[0-9a-f-]{36}/i);
  await page.goBack();
  await expect(page.getByRole("heading", { name: /purchase requests/i })).toBeVisible();
});
