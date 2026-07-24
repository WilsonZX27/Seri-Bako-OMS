const { test, expect } = require("@playwright/test");

const routes = ["/login", "/forgot-password", "/change-password", "/set-password", "/access-status", "/setup"];
const viewports = [
  { label: "mobile-390", width: 390, height: 844 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "desktop-1440", width: 1440, height: 960 },
];

async function assertSurface(page, route, viewport) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => Array.from(document.styleSheets).some((sheet) => {
    if (!sheet.href?.includes("/_next/static/css/")) return false;
    try { return sheet.cssRules.length > 0; } catch { return false; }
  })), { timeout: 15_000 }).toBe(true);
  await expect(page.getByText("This page could not load", { exact: true })).toHaveCount(0);
  const result = await page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const controls = Array.from(document.querySelectorAll("a,button,input,select,textarea,summary,[role='button'],[role='link']")).filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && (rect.left < -1 || rect.right > window.innerWidth + 1);
    }).map((node) => ({ tag: node.tagName, right: node.getBoundingClientRect().right }));
    return { overflow, controls };
  });
  expect(result.overflow, `${viewport.label} ${route} must not overflow`).toBeLessThanOrEqual(5);
  expect(result.controls, `${viewport.label} ${route} controls must remain in bounds`).toEqual([]);
}

for (const viewport of viewports) {
  test(`${viewport.label}: auth and setup surfaces stay responsive`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    for (const route of routes) await assertSurface(page, route, viewport);
  });
}
