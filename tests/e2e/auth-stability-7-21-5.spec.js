const { test, expect } = require("@playwright/test");
const { requireAccount } = require("./helpers");

test("Outlet Staff reaches a stable dashboard route without a redirect loop", async ({ page }) => {
  const creds = requireAccount("outlet");
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(creds.email);
  await page.locator('input[name="password"]').fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  // The scoped outlet dashboard now uses the shared identity header and
  // role-specific completion card instead of the retired "Outlet Today"
  // heading. Assert the durable contract so this test catches auth redirects
  // without coupling it to an obsolete presentation label.
  await expect(page.locator("[data-dashboard-identity]").first()).toContainText(/Outlet Staff/i);
  await expect(page.getByRole("heading", { name: "Today's completion" })).toBeVisible();
  await page.waitForTimeout(1_000);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("link", { name: /today('|’)s record|daily records/i }).first()).toBeVisible();
});
