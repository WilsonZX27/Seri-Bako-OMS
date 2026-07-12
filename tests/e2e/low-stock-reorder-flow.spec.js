const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("low stock page exposes reorder link", async ({ page }) => {
  expect(await login(page, "superAdmin")).toBe(true);
  await page.goto("/low-stock?search=QA-ING-A-721A");
  await expect(page.locator("body")).toContainText("QA-ING-A-721A");
  await expect(page.locator("body")).toContainText("low stock");
  await page.getByRole("link", { name: /Create PR for QA-ING-A-721A/i }).first().click();
  await expect(page).toHaveURL(/\/purchase-requests\/new/);
  await expect(page.locator('input[name="line_qty"]')).not.toHaveValue("");
  await expect(page.locator('input[name="line_item_id"]')).not.toHaveValue("");
});
