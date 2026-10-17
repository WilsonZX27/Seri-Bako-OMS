const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

test("legacy production URL enters the maintained jobs workspace", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Missing local-only Super Admin credentials.");
  await login(page, "superAdmin");
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/production", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/production\/jobs$/);
    await expect(page.getByRole("heading", { name: "Production Jobs", exact: true })).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (width < 1024) await page.getByRole("button", { name: "Open more actions", exact: true }).click();
    await expect(page.getByRole("link", { name: "Demand Variance", exact: true }).filter({ visible: true })).toBeVisible();
  }
});
