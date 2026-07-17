const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("kitchen cannot see restricted approval controls", async ({ page }) => {
  test.skip(!process.env.TEST_KITCHEN_EMAIL || !process.env.TEST_KITCHEN_PASSWORD, "Missing kitchen test credentials.");
  expect(await login(page, "kitchen")).toBe(true);
  await page.goto("/purchase-requests");
  await expect(page.getByRole("button", { name: /manager approve|complete purchasing review|convert to purchase order/i })).toHaveCount(0);
});

for (const role of ["kitchen", "purchasing", "finance"]) {
  test(`${role} cannot see manager approval action`, async ({ page }) => {
    const emailKey = `TEST_${role === "purchasing" ? "PURCHASING" : role.toUpperCase()}_EMAIL`;
    const passwordKey = `TEST_${role === "purchasing" ? "PURCHASING" : role.toUpperCase()}_PASSWORD`;
    test.skip(!process.env[emailKey] || !process.env[passwordKey], `Missing ${role} test credentials.`);
    expect(await login(page, role)).toBe(true);
    await page.goto("/purchase-requests?status=manager_review");
    await expect(page.getByRole("button", { name: /manager approve/i })).toHaveCount(0);
  });
}

test("administrator cannot assign owner role from staff creation", async ({ page }) => {
  test.skip(!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD, "Missing admin test credentials.");
  expect(await login(page, "admin")).toBe(true);
  await page.goto("/staffs/new", { waitUntil: "domcontentloaded" });
  await expect(page.locator('select[name="role_id"] option', { hasText: "Super Admin / Owner" })).toHaveCount(0);
});

test("administrator can read operational PRs but cannot open finance payables", async ({ page }) => {
  test.skip(!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD, "Missing admin test credentials.");
  expect(await login(page, "admin")).toBe(true);
  await page.goto("/purchase-requests");
  await expect(page.getByRole("heading", { name: /purchase requests/i })).toBeVisible();
  const firstRecord = page.locator("tbody tr").filter({ has: page.locator('a[href^="/purchase-requests/"]') }).first();
  if (await firstRecord.count()) {
    await firstRecord.locator('a[href^="/purchase-requests/"]').first().click();
    await expect(page).toHaveURL(/\/purchase-requests\//);
  }
  await page.goto("/supplier-invoices/aging");
  await expect(page).not.toHaveURL(/\/supplier-invoices\/aging$/);
});

test("finance can open payables but cannot perform manager approval", async ({ page }) => {
  test.skip(!process.env.TEST_FINANCE_EMAIL || !process.env.TEST_FINANCE_PASSWORD, "Missing finance test credentials.");
  expect(await login(page, "finance")).toBe(true);
  await page.goto("/supplier-invoices/aging");
  await expect(page.getByRole("heading", { name: "AP Aging" })).toBeVisible();
  await page.goto("/purchase-requests?status=manager_review");
  await expect(page.getByRole("button", { name: /manager approve/i })).toHaveCount(0);
});

test("outlet staff is denied procurement workspaces", async ({ page }) => {
  test.skip(!process.env.TEST_OUTLET_EMAIL || !process.env.TEST_OUTLET_PASSWORD, "Missing outlet staff test credentials.");
  expect(await login(page, "outlet")).toBe(true);
  await page.goto("/outlet-daily-records");
  await expect(page.getByRole("heading", { name: /outlet daily records/i })).toBeVisible();
  await page.goto("/purchase-requests");
  await expect(page).not.toHaveURL(/\/purchase-requests$/);
});
