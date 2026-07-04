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
    await page.goto("/purchase-requests?status=pending_approval");
    await expect(page.getByRole("button", { name: /manager approve/i })).toHaveCount(0);
  });
}

test("administrator cannot assign owner role from staff creation", async ({ page }) => {
  test.skip(!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD, "Missing admin test credentials.");
  expect(await login(page, "admin")).toBe(true);
  await page.goto("/staffs/new");
  await expect(page.locator('select[name="role_id"] option', { hasText: "Super Admin / Owner" })).toHaveCount(0);
});
