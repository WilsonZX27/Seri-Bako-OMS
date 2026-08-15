const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-820", width: 820, height: 1180 },
  { name: "laptop-1180", width: 1180, height: 820 },
];

for (const viewport of viewports) {
  test(`stock count entry stays oriented at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    expect(await login(page, "superAdmin")).toBe(true);
    await page.goto("/stock-counts/new", { waitUntil: "domcontentloaded" });

    await expect(page.locator("[data-stock-count-workspace]")).toBeVisible();
    await expect(page.locator("[data-stock-count-line]").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

    const headerShadow = await page.locator("[data-document-workspace-header]").evaluate((element) => getComputedStyle(element).boxShadow);
    expect(headerShadow).not.toBe("none");

    if (viewport.width < 768) {
      await expect(page.getByRole("button", { name: /View workflow, step 1 of 2/i })).toBeVisible();
      // The compact two-column mobile cards keep only the row index; repeating
      // "of N" on every card adds noise without helping navigation.
      await expect(page.locator("[data-stock-count-line]").first()).toContainText(/^1/);
    }

    const geometry = await page.locator("[data-stock-count-line]").first().evaluate((row) => {
      const identity = row.children[0]?.getBoundingClientRect();
      const count = row.children[2]?.getBoundingClientRect();
      return identity && count ? { identityTop: identity.top, countTop: count.top } : null;
    });
    expect(geometry).not.toBeNull();
    if (viewport.width === 820) expect(geometry.countTop).toBeGreaterThan(geometry.identityTop + 10);
    if (viewport.width === 1180) expect(Math.abs(geometry.countTop - geometry.identityTop)).toBeLessThanOrEqual(10);
  });
}
