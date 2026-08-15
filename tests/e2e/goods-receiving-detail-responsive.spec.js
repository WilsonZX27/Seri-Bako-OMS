const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

const viewports = [
  { label: "mobile-390", width: 390, height: 844 },
  { label: "tablet-820", width: 820, height: 1180 },
  { label: "laptop-1180", width: 1180, height: 820 },
  { label: "desktop-1440", width: 1440, height: 900 },
];

test("goods receiving detail preserves line audit context without a phone table", async ({ page }) => {
  test.setTimeout(120_000);
  expect(await login(page, "superAdmin")).toBe(true);
  await page.goto("/goods-receivings?search=E2E-GRN-INVOICE-OPEN", { waitUntil: "domcontentloaded" });
  const fixtureLink = page.getByRole("link", { name: /Open E2E-GRN-INVOICE-OPEN/i }).first();
  await expect(fixtureLink).toBeVisible();
  await fixtureLink.click();
  await expect(page).toHaveURL(/\/goods-receivings\/[^/?]+/);
  const detailUrl = page.url();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(detailUrl, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${viewport.label} must not overflow`).toBeLessThanOrEqual(1);

    const mobileLines = page.locator("[data-goods-receiving-detail-lines]");
    const table = page.getByRole("table", { name: "Received items" });
    if (viewport.width < 1280) {
      await expect(mobileLines).toBeVisible();
      await expect(table).toBeHidden();
      await expect(mobileLines).toContainText("Received");
      await expect(mobileLines).toContainText("Ordered");
      await expect(mobileLines).toContainText("Previously");
      await expect(mobileLines).toContainText("Pending");
      await expect(mobileLines).toContainText("Stock value");
    } else {
      await expect(table).toBeVisible();
      await expect(mobileLines).toBeHidden();
    }
  }
});
