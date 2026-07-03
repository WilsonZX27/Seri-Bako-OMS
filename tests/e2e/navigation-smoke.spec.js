const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("admin navigation smoke", async ({ page }) => {
  test.skip(!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD, "Missing admin test credentials.");
  expect(await login(page, "admin")).toBe(true);
  for (const path of ["/dashboard", "/procurement", "/inventory", "/documents", "/staffs"]) {
    await page.goto(path);
    await expect(page.locator("body")).toContainText(/Seri Bako|Dashboard|Workspace|Staff|Document|Inventory|Procurement/i);
  }
});
