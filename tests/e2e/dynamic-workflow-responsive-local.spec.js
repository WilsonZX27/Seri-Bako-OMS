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
  { slug: "stock-transfers-new", route: "/stock-transfers/new", title: "New Stock Transfer" },
  { slug: "stock-wastage-new", route: "/stock-wastage/new", title: "New Stock Wastage" },
  { slug: "production-jobs-new", route: "/production/jobs/new", title: "New Production Job" },
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
      await expect.poll(() => hasParsedStyles(page), { timeout: 15_000 }).toBe(true);
      // Some operational headers are rendered by the shared shell with a compact
      // semantic heading, while others may be represented as an exact title node
      // after a server transition. Verify the user-visible title without coupling
      // the audit to one particular heading implementation.
      await expect.poll(() => page.evaluate((title) => Array.from(document.querySelectorAll("h1, header span, [data-document-breadcrumb]"))
        .some((node) => node.textContent?.trim() === title && (() => { const rect = node.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; })()), workflow.title)).toBe(true);
      await expect(page.getByText("This page could not load", { exact: true })).toHaveCount(0);

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
