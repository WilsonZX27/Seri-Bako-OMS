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

test("stock count preserves prefilled adjustment controls, optional variance context, and a full-width tablet workspace", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!hasAccount("superAdmin"), "Missing local-only Super Admin credentials.");
  await login(page, "superAdmin");

  for (const [width, height, label] of viewports) {
    await page.setViewportSize({ width, height });
    await page.goto("/stock-counts/new", { waitUntil: "domcontentloaded" });
    // A geometric assertion can accidentally pass against browser-default HTML.
    // Wait for the app's global design tokens before assessing a responsive layout.
    await expect.poll(async () => page.evaluate(() => Array.from(document.styleSheets).some((sheet) => {
      if (!sheet.href?.includes("/_next/static/css/")) return false;
      try {
        return sheet.cssRules.length > 0;
      } catch {
        return false;
      }
    })), { timeout: 15_000 }).toBe(true);
    if (width < 768) {
      await expect(page.locator("[data-mobile-page-title]")).toHaveText("Stock Count");
      await expect(page.locator("#main-content").getByText("New Stock Count", { exact: true })).toHaveCount(0);
    } else {
      await expect(page.getByText("New Stock Count", { exact: true })).toBeVisible();
    }
    const input = page.locator('input[name="line_physical_qty"]').first();
    await expect(input).toBeVisible();
    await expect(input).not.toHaveValue("");
    await expect(page.getByRole("button", { name: /decrease physical quantity/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /increase physical quantity/i }).first()).toBeVisible();
    await expect(page.getByText("Reason required")).toHaveCount(0);
    const inputBox = await input.boundingBox();
    expect(inputBox, `${label} physical quantity field must render`).toBeTruthy();
    expect(inputBox.width, `${label} physical quantity field must remain touchable`).toBeGreaterThanOrEqual(width < 768 ? 144 : 120);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${label} stock count must not horizontally overflow`).toBeLessThanOrEqual(5);
    if (width >= 1024) await expect(page.getByPlaceholder("Count note (optional)")).toBeVisible();
    if (width === 768) await expect(page.locator("[data-tablet-document-inspector]")).toHaveCount(0);
    if (width < 768) {
      const mobileAction = page.locator(".sb-mobile-action-bar").filter({ hasText: /review prefilled values|adjusted/i });
      await expect(mobileAction).toBeVisible();
      await expect(mobileAction).toContainText(/review prefilled values|\d+ adjusted/i);
    }
    await page.screenshot({ path: path.join(evidence, `${label}.png`), fullPage: true });
  }
});
