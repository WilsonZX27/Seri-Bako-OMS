const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const evidence = path.join(process.cwd(), "test-results", "dynamic-workflow-responsive-local");
const viewports = [
  { label: "mobile-390", width: 390, height: 844 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "desktop-1440", width: 1440, height: 960 },
];
const workflows = [
  { slug: "stock-transfers-new", route: "/stock-transfers/new", titles: ["Stock Transfers", "New Stock Transfer"] },
  { slug: "stock-wastage-new", route: "/stock-wastage/new", titles: ["Stock Wastage", "New Stock Wastage"] },
  { slug: "production-jobs-new", route: "/production/jobs/new", titles: ["Production", "Production Jobs", "New Production Job"] },
];

function hasParsedStyles(page) {
  return page.evaluate(() => Array.from(document.styleSheets).some((sheet) => {
    if (!sheet.href?.includes("/_next/static/css/")) return false;
    try { return sheet.cssRules.length > 0; } catch { return false; }
  }));
}

test("dynamic workflow forms remain usable across phone, tablet, and desktop", async ({ page }) => {
  test.setTimeout(180_000);
  test.skip(!hasAccount("superAdmin"), "Missing local-only Super Admin credentials.");
  fs.mkdirSync(evidence, { recursive: true });
  await login(page, "superAdmin");

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const workflow of workflows) {
      await page.goto(workflow.route, { waitUntil: "domcontentloaded" });
      // Next dev may compile the first workflow route lazily. Give the local
      // audit a bounded cold-start window, then keep all layout/overflow
      // assertions strict once styles are present.
      await expect.poll(() => hasParsedStyles(page), { timeout: 45_000, intervals: [250, 500, 1_000, 2_000] }).toBe(true);
      // Phone uses the shared, visible mobile context header; tablet and desktop
      // deliberately use the compact document workspace instead of duplicating a
      // page title. Assert the appropriate shell rather than requiring a heading
      // that the desktop design intentionally does not render.
      if (viewport.width < 768) {
        await expect.poll(() => page.evaluate((titles) => {
          const node = document.querySelector("[data-mobile-page-title]");
          return node instanceof HTMLElement && titles.includes(node.textContent?.trim() ?? "") && node.getBoundingClientRect().height > 0;
        }, workflow.titles)).toBe(true);
      } else {
        await expect(page.locator("[data-app-topbar]")).toBeVisible();
      }
      await expect(page.getByText("This page could not load", { exact: true })).toHaveCount(0);

      if (viewport.label === "mobile-390" && ["/stock-transfers/new", "/stock-wastage/new"].includes(workflow.route)) {
        const lines = page.locator("[data-stock-operation-line]");
        // The local stock fixture is allowed to grow with reconciled stock-take
        // items; keep the interaction contract strict without coupling it to a
        // historical row count.
        expect(await lines.count()).toBeGreaterThanOrEqual(6);
        await expect(page.locator("[data-stock-operation-line-details]:visible")).toHaveCount(1);
        await expect(lines.filter({ has: page.locator('input[name="line_enabled"]:not(:checked)') }).locator('[data-stock-operation-line-details]:visible')).toHaveCount(0);
        await lines.nth(1).locator('input[name="line_enabled"]').check();
        await expect(page.locator("[data-stock-operation-line-details]:visible")).toHaveCount(2);
      }

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${workflow.route} at ${viewport.label} must not overflow the page`).toBeLessThanOrEqual(5);

      const outOfBounds = await page.evaluate(() => Array.from(document.querySelectorAll("input, select, textarea, button, a")).filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1);
      }).map((node) => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 60), right: node.getBoundingClientRect().right })));
      expect(outOfBounds, `${workflow.route} controls must remain inside ${viewport.width}px`).toEqual([]);

      if (viewport.label === "mobile-390") {
        await page.screenshot({ path: path.join(evidence, `${workflow.slug}.png`), fullPage: true });
      }
    }
  }
});
