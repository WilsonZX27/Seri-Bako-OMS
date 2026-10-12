const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const viewports = [
  { name: "phone", width: 430, height: 932 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];

test("Stock Balance remains responsive after parallel enrichment reads", async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(!hasAccount("superAdmin"), "Missing Super Admin test credentials.");
  await login(page, "superAdmin");

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const pageErrors = [];
    const capturePageError = (error) => pageErrors.push(error.message);
    page.on("pageerror", capturePageError);
    const started = Date.now();
    const response = await page.goto("/stock-balance", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Stock Balance", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    const durationMs = Date.now() - started;
    console.log(`[stock-balance-smoke] ${viewport.name} ready in ${durationMs}ms`);
    expect(response?.ok()).toBe(true);
    expect(durationMs).toBeLessThan(8_000);
    expect(pageErrors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    page.off("pageerror", capturePageError);
  }
});
