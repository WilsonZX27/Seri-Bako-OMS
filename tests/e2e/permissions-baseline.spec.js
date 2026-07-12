const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("super admin keeps core operational access and ledger export", async ({ page }) => {
  expect(await login(page, "superAdmin")).toBe(true);
  await page.goto("/stock-transactions", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("Sprint 7.2.34");
  await expect(page.getByRole("link", { name: /CSV/i })).toBeVisible();
  expect((await page.request.get("/stock-transactions/export?search=QA-ING-A-721A")).status()).toBe(200);
  for (const label of ["Purchase Requests", "Goods Receiving", "Supplier Invoices", "Stock Count", "Stock Wastage", "Movement Ledger", "Production Jobs", "Users & Roles"]) {
    await expect(page.locator("body")).toContainText(label);
  }
});

test("purchasing can reach PR creation but not role administration", async ({ page }) => {
  test.skip(!process.env.TEST_PURCHASING_EMAIL || !process.env.TEST_PURCHASING_PASSWORD, "Missing purchasing test credentials.");
  expect(await login(page, "purchasing")).toBe(true);
  await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });
  await expect(page.locator("form#purchase-request-form")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Users & Roles");
  await page.goto("/stock-transactions", { waitUntil: "domcontentloaded" });
  expect((await page.request.get("/stock-transactions/export?search=QA-ING-A-721A")).status()).toBe(200);
});

test("kitchen can read production but cannot export ledger or manage roles", async ({ page }) => {
  test.skip(!process.env.TEST_KITCHEN_EMAIL || !process.env.TEST_KITCHEN_PASSWORD, "Missing kitchen test credentials.");
  expect(await login(page, "kitchen")).toBe(true);
  await page.goto("/production/jobs", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText(/Production/i);
  await expect(page.locator("body")).not.toContainText("Users & Roles");
  await page.goto("/stock-transactions", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: /CSV/i })).toHaveCount(0);
  expect((await page.request.get("/stock-transactions/export?search=QA-ING-A-721A")).status()).toBe(403);
});
