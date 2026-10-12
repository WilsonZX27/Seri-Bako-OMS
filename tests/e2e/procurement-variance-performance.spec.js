const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const viewports = [
  { name: "phone", width: 430, height: 932 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];

test("Procurement Variance remains responsive and bounded after indexed report reads", async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(!hasAccount("superAdmin"), "Missing Super Admin test credentials.");
  await login(page, "superAdmin");

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const started = Date.now();
    const response = await page.goto("/reports/procurement-variance", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-procurement-variance-workspace]")).toBeVisible();
    const durationMs = Date.now() - started;
    console.log(`[procurement-variance-smoke] ${viewport.name} ready in ${durationMs}ms`);
    expect(response?.ok()).toBe(true);
    expect(durationMs).toBeLessThan(8_000);
    expect(pageErrors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  }
});
