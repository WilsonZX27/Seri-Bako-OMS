const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("low stock page shows QA low stock and generated PR persists", async ({ page }) => {
  expect(await login(page, "superAdmin")).toBe(true);
  await page.goto("/low-stock?search=QA-ING-A-721A");
  await expect(page.locator("body")).toContainText("QA-ING-A-721A");
  await expect(page.locator("body")).toContainText("low stock");
  await page.goto("/purchase-requests?search=PR-00019", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("PR-00019");
  await expect(page.locator("body")).toContainText("Central Kitchen @ PJS10");
});
