const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("Purchasing navigation smoke", async ({ page }) => {
  test.skip(!process.env.TEST_PURCHASING_EMAIL || !process.env.TEST_PURCHASING_PASSWORD, "Missing Purchasing test credentials.");
  expect(await login(page, "purchasing")).toBe(true);
  for (const path of ["/dashboard", "/procurement", "/inventory", "/documents", "/staffs"]) {
    await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator("body")).toContainText(/Seri Bako|Dashboard|Workspace|Staff|Document|Inventory|Procurement/i);
  }
});
