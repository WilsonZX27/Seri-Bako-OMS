const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test.use({ hasTouch: true });

test("Costing Readiness module concentration previews before exact drill-through", async ({ page }) => {
  test.setTimeout(120_000);
  expect(await login(page, "superAdmin")).toBe(true);

  for (const viewport of [{ width: 393, height: 852 }, { width: 820, height: 1180 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/reports/costing-readiness?severity=critical", { waitUntil: "domcontentloaded" });
    const insight = page.locator("[data-costing-readiness-insights]");
    await expect(insight).toBeVisible();
    await expect(insight).toContainText(/Current master data and recipe lines · critical · issue counts/);

    const ranking = insight.locator("[data-interactive-ranking-chart]");
    await expect(ranking.getByRole("listitem")).toHaveCount(4);
    const firstModule = ranking.locator("[data-ranking-row]").first();
    const reportUrl = page.url();
    if (viewport.width === 393) await firstModule.tap();
    else await firstModule.focus();
    await expect(page).toHaveURL(reportUrl);
    await expect(ranking.locator("[data-ranking-preview]")).toContainText("Scope: critical");
    await expect(ranking.locator("[data-ranking-open]")).toHaveAttribute("href", /severity=critical/);
    await expect(ranking.locator("[data-ranking-open]")).toHaveAttribute("href", /module=/);
    const zeroBarsHaveNoFill = await ranking.getByRole("listitem").filter({ hasText: "0 issues" }).evaluateAll((rows) => rows.every((row) => {
      const fill = row.querySelector('[aria-hidden="true"] > span');
      return fill && fill.getBoundingClientRect().width === 0;
    }));
    expect(zeroBarsHaveNoFill).toBe(true);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(5);
    await page.screenshot({ path: `test-results/costing-readiness-insights-${viewport.width}x${viewport.height}.png`, fullPage: false });
  }
});
