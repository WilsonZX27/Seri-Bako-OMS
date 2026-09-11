const { test, expect } = require("@playwright/test");
const path = require("node:path");
const { hasAccount, login } = require("./helpers");

const viewports = [
  { name: "phone-390x844", width: 390, height: 844 },
  { name: "tablet-portrait-820x1180", width: 820, height: 1180 },
  { name: "tablet-landscape-1180x820", width: 1180, height: 820 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test(`Compliance Preview is contained at ${viewport.name}`, async ({ page }) => {
    test.skip(!hasAccount("superAdmin"), "Missing super-admin test credentials.");
    expect(await login(page, "superAdmin")).toBe(true);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto("/compliance", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Compliance/, exact: false }).first()).toBeVisible();
    const geometry = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
    expect(geometry.page).toBeLessThanOrEqual(geometry.viewport);
    for (const label of ["Missing", "Due / expired", "Compliance register", "New requirement"]) {
      const item = page.getByText(label, { exact: true }).filter({ visible: true }).first();
      await expect(item).toBeVisible();
      expect(await item.evaluate((node) => node.getClientRects().length)).toBe(1);
    }
    const calendar = page.getByRole("link", { name: /^Open calendar$/i }).filter({ visible: true }).first();
    await expect(calendar).toBeVisible();
    expect(await calendar.evaluate((node) => node.getClientRects().length)).toBe(1);
    expect(errors).toEqual([]);
    await page.screenshot({ path: path.join("outputs", "compliance-preview", `${viewport.name}.png`), fullPage: true });
  });
}
