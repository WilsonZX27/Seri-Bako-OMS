const { test, expect } = require("@playwright/test");
const { requireAccount } = require("./helpers");

test("Outlet Staff reaches a stable dashboard route without a redirect loop", async ({ page }) => {
  const creds = requireAccount("outlet");
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(creds.email);
  await page.locator('input[name="password"]').fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Outlet Today" })).toBeVisible();
  await page.waitForTimeout(1_000);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("link", { name: "Start daily record" })).toBeVisible();
});
