const path = require("path");
const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("Sprint 7.2.33 master data imports", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(process.env.TEST_IMPORT_MUTATION !== "1", "Set TEST_IMPORT_MUTATION=1 to run import mutation QA.");
  expect(await login(page, "superAdmin")).toBe(true);

  async function runImport(route, fixture, expectedMessage, confirmPosting = false) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText("Sprint 7.2.33");
    await page.waitForTimeout(1000);
    const filePath = path.join(__dirname, "..", "fixtures", "imports", fixture);
    await page.locator('input[type="file"]').setInputFiles(filePath);
    if (!(await page.locator("body").textContent()).includes("3 row(s) loaded")) {
      await page.locator('input[type="file"]').setInputFiles(filePath);
    }
    await expect(page.locator("body")).toContainText("3 row(s) loaded");
    if (confirmPosting) await page.getByLabel(/post opening stock/i).check();
    await page.getByRole("button", { name: /Proceed \/ Confirm Import/i }).click();
    await expect(page.locator("body")).toContainText(expectedMessage, { timeout: 30_000 });
  }

  await page.goto("/administration/imports", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("Items");
  await expect(page.locator("body")).toContainText("Opening Stock");

  await runImport("/imports/items", "items-733.csv", /Imported: 1|Skipped: 1/);
  await runImport("/imports/suppliers", "suppliers-733.csv", /Imported: 1|Skipped: 1/);
  await runImport("/imports/branches", "branches-733.csv", /Imported: 1|Skipped: 1/);
  await runImport("/imports/staff", "staff-733.csv", /Imported: 1|Skipped: 1/);
  await runImport("/opening-stock/import", "opening-stock-733.csv", /Imported: 1|Skipped: 1/, true);

  await page.goto("/items?search=QA-IMP-ITEM-733", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("QA-IMP-ITEM-733");
  await page.goto("/suppliers?search=QA-IMP-SUP-733", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("QA-IMP-SUP-733");
  await page.goto("/branches?search=QA-IMP-BR-733", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("QA-IMP-BR-733");
  await page.goto("/staffs?search=QA-IMP-STAFF-733", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("QA-IMP-STAFF-733");
  await page.goto("/stock-transactions?search=QA-IMP-ITEM-733", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("Opening balance");
  await expect(page.locator("body")).toContainText("QA-IMP-ITEM-733");
});
