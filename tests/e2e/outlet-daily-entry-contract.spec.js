const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

test("outlet daily entry exposes one role-aware action and usable conditional details", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Missing Super Admin test credentials.");
  await login(page, "superAdmin");

  for (const viewport of [
    { width: 430, height: 932 },
    { width: 820, height: 1180 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/outlet-daily-records/new", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Complete Daily Record" }).first()).toBeVisible();
    await expect(page.locator("[data-outlet-daily-setup] > summary")).toContainText("Record setup");
    await expect(page.locator("[data-outlet-daily-setup] > summary")).not.toContainText("·");

    const wastage = page.locator('input[name="wastage_qty"]:not([disabled])').first();
    await wastage.fill("1");
    const line = wastage.locator("xpath=ancestor::div[contains(@class, 'grid')][1]");
    await expect(line.locator('select[name="wastage_reason"]')).toHaveValue("unsold");
    await line.getByRole("button", { name: /Add remarks/ }).click();
    await expect(line.locator('input[name="line_notes"]')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }

  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/outlet-daily-records/new", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(() => page.locator("[data-document-workspace-header]").getAttribute("data-context-compact")).toBe("true");
});
