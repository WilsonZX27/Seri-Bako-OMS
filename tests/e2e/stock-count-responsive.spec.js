const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const evidence = path.join(process.cwd(), "test-results", "stock-count-responsive");
const viewports = [
  [390, 844, "mobile"],
  [768, 1024, "tablet"],
  [1440, 960, "desktop"],
];

test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));

test("stock count preserves a practical physical input and a neutral mobile action bar", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!hasAccount("superAdmin"), "Missing local-only Super Admin credentials.");
  await login(page, "superAdmin");

  for (const [width, height, label] of viewports) {
    await page.setViewportSize({ width, height });
    await page.goto("/stock-counts/new", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#main-content").getByText("New Stock Count", { exact: true })).toBeVisible();
    const input = page.locator('input[name="line_physical_qty"]').first();
    await expect(input).toBeVisible();
    const inputBox = await input.boundingBox();
    expect(inputBox, `${label} physical quantity field must render`).toBeTruthy();
    expect(inputBox.width, `${label} physical quantity field must remain touchable`).toBeGreaterThanOrEqual(width < 768 ? 144 : 120);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${label} stock count must not horizontally overflow`).toBeLessThanOrEqual(5);
    if (width < 768) {
      const mobileAction = page.locator("[data-mobile-document-action]");
      await expect(mobileAction).toBeVisible();
      await expect(mobileAction).toContainText(/create draft count/i);
    }
    await page.screenshot({ path: path.join(evidence, `${label}.png`), fullPage: true });
  }
});
