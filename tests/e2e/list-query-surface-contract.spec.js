const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const routes = [
  "/production/jobs",
  "/purchase-requests",
  "/purchase-orders",
  "/goods-receivings",
  "/purchase-returns",
  "/supplier-invoices",
  "/suppliers",
  "/outlet-daily-records",
  "/items",
  "/recipes",
  "/uom-conversions",
  "/stock-wastage",
  "/stock-balance",
];
const viewports = [
  { name: "phone", width: 430, height: 932 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];

test("list query and content surfaces keep the shared responsive contract", async ({ page }) => {
  test.setTimeout(3 * 60_000);
  test.skip(!hasAccount("superAdmin"), "Missing Super Admin test credentials.");
  await login(page, "superAdmin");

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const query = page.locator("form.sb-list-query-card:visible").first();
      const content = page.locator(".sb-list-content-card:visible").first();
      await expect(query, `${route} ${viewport.name} query card`).toBeVisible();
      await expect(content, `${route} ${viewport.name} content card`).toBeVisible();

      const geometry = await page.evaluate(() => {
        const visible = (element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        };
        const queryCard = Array.from(document.querySelectorAll("form.sb-list-query-card")).find(visible);
        const contentCard = Array.from(document.querySelectorAll(".sb-list-content-card")).find(visible);
        const controls = Array.from(queryCard?.querySelectorAll("input, select, summary, button") ?? []).filter(visible);
        return {
          queryBottom: queryCard?.getBoundingClientRect().bottom ?? 0,
          contentTop: contentCard?.getBoundingClientRect().top ?? 0,
          horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
          controlHeights: controls.map((control) => Math.round(control.getBoundingClientRect().height)),
        };
      });

      expect(geometry.contentTop, `${route} ${viewport.name} surfaces must not overlap`).toBeGreaterThanOrEqual(geometry.queryBottom);
      expect(geometry.horizontalOverflow, `${route} ${viewport.name} must not overflow`).toBeLessThanOrEqual(1);
      expect(geometry.controlHeights.every((height) => height === 44), `${route} ${viewport.name} controls must share the 44px contract: ${geometry.controlHeights}`).toBe(true);
    }
  }
});
