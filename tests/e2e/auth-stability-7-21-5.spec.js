const { test, expect } = require("@playwright/test");
const { requireAccount } = require("./helpers");

test("invited Outlet Staff reaches a stable password-change page without a redirect loop", async ({ page }) => {
  const creds = requireAccount("outlet");
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(creds.email);
  await page.locator('input[name="password"]').fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/\/change-password/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Change your password" })).toBeVisible();
  await page.waitForTimeout(1_000);
  await expect(page).toHaveURL(/\/change-password/);
  await expect(page.getByRole("button", { name: "Change password" })).toBeVisible();
});
