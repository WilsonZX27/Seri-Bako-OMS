const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const evidence = path.join(process.cwd(), "test-results", "supplier-invoice-create-responsive");
const viewports = [
  { label: "mobile-390", width: 390, height: 844 },
  { label: "tablet-820", width: 820, height: 1180 },
  { label: "laptop-1180", width: 1180, height: 820 },
];

test("supplier invoice matching is flat and progressively disclosed", async ({ page }) => {
  test.setTimeout(180_000);
  test.skip(!hasAccount("superAdmin"), "Missing local-only Super Admin credentials.");
  fs.mkdirSync(evidence, { recursive: true });
  await login(page, "superAdmin");
  await page.goto("/supplier-invoices/new", { waitUntil: "domcontentloaded" });

  const supplierIds = await page.locator('select[name="supplier_id"] option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
  let eligibleSupplierId = null;
  for (const supplierId of supplierIds) {
    await page.goto(`/supplier-invoices/new?supplier_id=${encodeURIComponent(supplierId)}`, { waitUntil: "domcontentloaded" });
    if (await page.locator("[data-supplier-invoice-grn]").count()) {
      eligibleSupplierId = supplierId;
      break;
    }
  }
  test.skip(!eligibleSupplierId, "Local fixture has no supplier with an eligible posted GRN.");

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(`/supplier-invoices/new?supplier_id=${encodeURIComponent(eligibleSupplierId)}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("This page could not load", { exact: true })).toHaveCount(0);
    await expect(page.locator(".erp-surface [data-supplier-invoice-grn].erp-surface")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${viewport.label} must not overflow`).toBeLessThanOrEqual(5);

    if (viewport.label === "mobile-390") {
      const mobileLines = page.locator("[data-supplier-invoice-line-list] article");
      await expect(mobileLines.first()).toBeVisible();
      await expect(page.getByText("Select at least one receiving line before saving the invoice.", { exact: true })).toBeVisible();
      await expect(page.locator("[data-supplier-invoice-line-editor]:visible")).toHaveCount(0);
      await mobileLines.first().locator('input[type="checkbox"]').check();
      await expect(page.locator("[data-supplier-invoice-line-editor]:visible")).toHaveCount(1);
      await expect(page.getByText("1 invoice line selected.", { exact: true })).toBeVisible();
      await page.screenshot({ path: path.join(evidence, "mobile-selected-line.png"), fullPage: true });
    }
  }
});
