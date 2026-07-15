const { test, expect } = require("@playwright/test");
const { hasAccount, login, missingAccountVars } = require("./helpers");

async function expectNoPageOverflow(page) {
  const width = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(width.document).toBeLessThanOrEqual(width.viewport + 1);
}

test("supplier lifecycle is console-only and item supplier lookup is bounded, searchable, and mobile-safe", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await login(page, "superAdmin");

  await page.goto("/suppliers", { waitUntil: "domcontentloaded" });
  const supplierRow = page.locator("tbody tr").first();
  test.skip(!(await supplierRow.count()) || (await page.getByText("No suppliers found").isVisible()), "No supplier fixture is available.");
  const supplierHref = await supplierRow.locator("a[aria-label^='Open']").getAttribute("href");
  await page.goto(supplierHref, { waitUntil: "domcontentloaded" });
  await expect(page.locator("form#supplier-edit-form [name='status']")).toHaveCount(0);
  await expect(page.locator("[data-right-console]").getByText("Status", { exact: true })).toBeVisible();
  await expect(page.locator("[data-right-console]").getByText(/Deactivate supplier|Restore Supplier/)).toBeVisible();

  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/items/new", { waitUntil: "domcontentloaded" });
  const supplierSearch = page.getByPlaceholder("Search supplier code or name");
  await expect(supplierSearch).toBeVisible();
  await expect(page.locator("select[name='supplier_id']")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Create supplier" })).toBeVisible();
  await supplierSearch.fill("NO-SUCH-SUPPLIER-7-5");
  await expect(page.getByText("No matching active supplier. Choose a listed result or clear the field.")).toBeVisible();
  await expectNoPageOverflow(page);
});

test("item import exposes exact supplier mapping columns and resolved-supplier preview", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await login(page, "superAdmin");
  await page.goto("/suppliers?status=active", { waitUntil: "domcontentloaded" });
  const supplierCells = page.locator("tbody tr").first().locator("td");
  const supplierCode = (await supplierCells.nth(1).textContent())?.trim();
  const supplierName = (await supplierCells.nth(2).textContent())?.trim();
  test.skip(!supplierCode || supplierCode === "-" || !supplierName, "No active coded supplier is available for preview verification.");
  await page.goto("/imports/items", { waitUntil: "domcontentloaded" });

  for (const column of ["supplier_code", "supplier_item_code", "supplier_price", "purchase_uom", "minimum_order_qty", "lead_time_days"]) {
    await expect(page.getByText(column, { exact: true }).first()).toBeVisible();
  }

  await page.getByRole("button", { name: "Edit in table" }).click();
  await page.getByRole("button", { name: "Add blank row" }).click();
  const headers = await page.locator("table thead th").allTextContents();
  const inputs = page.locator("table tbody tr").first().locator("input");
  const values = {
    item_code: "QA-PREVIEW-ONLY",
    item_name: "Preview only item",
    category: "QA",
    base_uom: "PCS",
    supplier_code: supplierCode,
  };
  for (const [column, value] of Object.entries(values)) {
    await inputs.nth(headers.findIndex((header) => header.trim() === column) - 1).fill(value);
  }
  await expect(page.locator("table tbody tr").first()).toContainText(`Resolved: ${supplierCode} - ${supplierName}`);
});

test("shared attachment picker is compact and operational document actions retain immediate pending labels", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await login(page, "superAdmin");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/purchase-requests", { waitUntil: "domcontentloaded" });
  const row = page.locator("tbody tr").first();
  test.skip(!(await row.count()) || (await page.getByText("No purchase requests found").isVisible()), "No purchase request fixture is available.");
  const href = await row.locator("a[aria-label^='Open']").getAttribute("href");
  await page.goto(href, { waitUntil: "domcontentloaded" });

  const openActions = page.getByRole("button", { name: "Open page actions" });
  if (await openActions.isVisible()) await openActions.click();
  const chooseFile = page.getByText("Choose file", { exact: true }).last();
  test.skip(!(await chooseFile.count()), "Selected PR has no linked document attachment panel.");
  await expect(chooseFile).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload attachment" }).last()).toBeVisible();
  await expect(page.locator('input[type="file"][name="file"]').last()).toHaveAttribute("accept", /\.pdf/);
  await expectNoPageOverflow(page);

  const convertButton = page.getByRole("button", { name: "Convert to Purchase Order" });
  if (await convertButton.count()) await expect(convertButton).toHaveAttribute("aria-busy", "false");
});
