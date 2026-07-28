const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const evidence = path.join(process.cwd(), "test-results", "mobile-visual-language");
const canonicalRoutes = [
  "/account", "/activity", "/administration", "/administration/backups", "/administration/imports", "/administration/master-data-cleanup",
  "/branches", "/branches/new", "/company", "/daily-operations", "/dashboard", "/data-onboarding", "/documents",
  "/document-sequences", "/document-sequences/new", "/goods-receivings", "/goods-receivings/new", "/imports", "/inventory",
  "/items", "/items/new", "/low-stock", "/opening-stock/import", "/outlet-daily-records", "/outlet-daily-records/new",
  "/procurement", "/procurement/purchase-requests", "/production", "/production/jobs", "/production/jobs/new", "/production/planning",
  "/production/variance", "/products", "/products/new", "/purchase-orders", "/purchase-orders/new", "/purchase-requests",
  "/purchase-requests/new", "/purchase-returns", "/purchase-returns/new", "/quick-tools", "/recipes", "/recipes/new", "/reports",
  "/reports/costing-readiness", "/reports/demand-trends", "/reports/procurement-variance", "/reports/product-margin", "/reports/recipe-costing",
  "/roles", "/roles/new", "/settings", "/settings/backups", "/staffs", "/staffs/new", "/stock-balance", "/stock-balances", "/stock-card",
  "/stock-counts", "/stock-counts/new", "/stock-transactions", "/stock-transactions/new", "/stock-transfers", "/stock-transfers/new",
  "/stock-wastage", "/stock-wastage/new", "/supplier-invoices", "/supplier-invoices/aging", "/supplier-invoices/cash-flow", "/supplier-invoices/new",
  "/supplier-items", "/supplier-items/new", "/suppliers", "/suppliers/new", "/uom-conversions", "/uom-conversions/new",
];
const routes = process.env.MOBILE_VISUAL_ROUTE ? [process.env.MOBILE_VISUAL_ROUTE] : canonicalRoutes;

test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));

test("phone surfaces use one green action system and one radius vocabulary", async ({ page }) => {
  test.setTimeout(10 * 60_000);
  test.skip(!hasAccount("superAdmin"), "Missing local-only Super Admin credentials.");
  await login(page, "superAdmin");
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-app-topbar]")).toBeVisible();
    await page.waitForTimeout(500);

    let visualLanguage;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        visualLanguage = await page.evaluate(() => {
          const visible = (element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
          };
          const legacyBrown = new Set(["rgb(138, 90, 43)", "rgb(161, 106, 50)"]);
          const brownActions = Array.from(document.querySelectorAll("button, a"))
            .filter(visible)
            .filter((element) => legacyBrown.has(getComputedStyle(element).backgroundColor))
            .map((element) => element.textContent?.trim().slice(0, 60));
          const legacyRadius = Array.from(document.querySelectorAll("*"))
            .filter((element) => typeof element.className === "string" && element.className.split(/\s+/).includes("rounded-[2px]"))
            .filter(visible)
            .map((element) => ({ className: element.className, radius: getComputedStyle(element).borderRadius }));
          const title = document.querySelector("[data-mobile-page-title]")?.getBoundingClientRect();
          const titleOffset = title ? Math.abs((title.left + title.width / 2) - window.innerWidth / 2) : null;
          return { brownActions, legacyRadius, titleOffset };
        });
        break;
      } catch (error) {
        if (!/Execution context was destroyed/.test(String(error)) || attempt === 2) throw error;
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(500);
      }
    }

    expect(visualLanguage.brownActions, `${route} must not use legacy brown for ordinary actions`).toEqual([]);
    expect(
      visualLanguage.legacyRadius.every(({ radius }) => radius === "10px" || radius === "12px"),
      `${route} legacy phone surfaces must normalize to the 10px control or 12px panel radius; found ${JSON.stringify(visualLanguage.legacyRadius.filter(({ radius }) => radius !== "10px" && radius !== "12px").slice(0, 3))}`,
    ).toBe(true);
    expect(visualLanguage.titleOffset, `${route} phone title must exist`).not.toBeNull();
    expect(visualLanguage.titleOffset, `${route} phone title must remain centered`).toBeLessThanOrEqual(1);

    const safeName = route.slice(1).replaceAll("/", "--");
    await page.screenshot({ path: path.join(evidence, `${safeName}.png`), fullPage: true });
  }
});
