const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const viewports = [
  { name: "phone", width: 430, height: 932 },
  { name: "desktop", width: 1440, height: 900 },
];
const reportRoutes = ["/reports/demand-trends", "/reports/product-margin", "/reports/recipe-costing"];

test("ranking preview changes content without moving the ranked rows", async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(!hasAccount("superAdmin"), "Missing Super Admin test credentials.");
  await login(page, "superAdmin");

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    let chart = null;
    for (const route of reportRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const candidate = page.locator("[data-interactive-ranking-chart]").first();
      if (await candidate.locator("[data-ranking-row]").count() >= 2) {
        chart = candidate;
        break;
      }
    }
    test.skip(!chart, "The report fixtures have fewer than two ranked records.");
    const rows = chart.locator("[data-ranking-row]");

    const preview = chart.locator("[data-ranking-preview]");
    await expect(preview).toBeVisible();
    const before = await rows.nth(1).boundingBox();
    const previewBefore = await preview.boundingBox();

    await rows.nth(0).hover();
    await expect(rows.nth(0)).toHaveAttribute("aria-pressed", "true");
    const firstLabel = await preview.locator("p").first().textContent();
    const afterFirst = await rows.nth(1).boundingBox();

    await rows.nth(1).focus();
    await expect(rows.nth(1)).toHaveAttribute("aria-pressed", "true");
    const secondLabel = await preview.locator("p").first().textContent();
    const afterSecond = await rows.nth(1).boundingBox();
    const previewAfter = await preview.boundingBox();

    expect(firstLabel).not.toBe(secondLabel);
    expect(afterFirst?.y).toBe(before?.y);
    expect(afterSecond?.y).toBe(before?.y);
    expect(previewAfter?.y).toBe(previewBefore?.y);
    expect(previewAfter?.height).toBeGreaterThanOrEqual(72);
  }
});
