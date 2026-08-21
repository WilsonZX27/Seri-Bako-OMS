const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

async function expectNoPageOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(5);
}

test.beforeEach(async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Missing super-admin test credentials.");
  await login(page, "superAdmin");
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 1180, height: 820 },
  { width: 1440, height: 900 },
]) {
  test(`v8.64.67 compact stock registers at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/stock-balance", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main#main-content")).toBeVisible({ timeout: 30_000 });
    if (viewport.width >= 1280) {
      await expect(page.getByRole("columnheader", { name: "Available / Reserved" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Avg Cost / Value" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Reserved", exact: true })).toHaveCount(0);
    }
    await expectNoPageOverflow(page);

    await page.goto("/stock-counts", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main#main-content")).toBeVisible({ timeout: 30_000 });
    if (viewport.width >= 1280) {
      await expect(page.getByRole("columnheader", { name: /SC No \/ Submitted by/ })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Submitted by", exact: true })).toHaveCount(0);
    }
    await expectNoPageOverflow(page);
  });
}

test("v8.64.67 wastage details clear when quantity returns to zero", async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto("/outlet-daily-records/new", { waitUntil: "domcontentloaded" });
  const wastage = page.locator('input[name="wastage_qty"]').first();
  await expect(wastage, "Run setup-local-dashboard-e2e.mjs --annotation-fixture before this suite.").toBeVisible({ timeout: 30_000 });
  const line = wastage.locator("xpath=ancestor::div[.//input[@name='line_product_id']][1]");
  await wastage.fill("1");
  const reason = line.locator('select[name="wastage_reason"]');
  await expect(reason).toBeVisible();
  await reason.selectOption("damaged");
  await wastage.fill("0");
  await expect(reason).toHaveCount(0);
  await expect(line.locator('input[name="wastage_reason"]')).toHaveValue("");
  await expectNoPageOverflow(page);
});
