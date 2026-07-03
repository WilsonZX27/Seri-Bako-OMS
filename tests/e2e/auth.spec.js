const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("logged-out dashboard redirects to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("super admin can sign in when credentials are provided", async ({ page }) => {
  test.skip(!process.env.TEST_SUPER_ADMIN_EMAIL || !process.env.TEST_SUPER_ADMIN_PASSWORD, "Missing super admin test credentials.");
  expect(await login(page, "superAdmin")).toBe(true);
  await expect(page).toHaveURL(/\/dashboard/);
});
