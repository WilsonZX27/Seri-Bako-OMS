const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("supplier invoice paid state is persisted", async ({ page }) => {
  const invoiceNo = process.env.TEST_SUPPLIER_INVOICE_NO || "QA-INV-729-001";
  expect(await login(page, "superAdmin")).toBe(true);
  await page.goto(`/supplier-invoices?search=${encodeURIComponent(invoiceNo)}`);
  await expect(page.getByText(invoiceNo)).toBeVisible();
  await page.getByRole("link", { name: new RegExp(`View .*`, "i") }).first().click();
  await expect(page).toHaveURL(/\/supplier-invoices\//);
  await expect(page.locator("body")).toContainText(invoiceNo);
  await expect(page.locator("body")).toContainText("PO-00002");
  await expect(page.locator("body")).toContainText("GRN-00004");
  await expect(page.locator("body")).toContainText(/RM\s*112\.00/);
  await expect(page.locator("body")).toContainText("2 payment(s)");
  await expect(page.locator("body")).toContainText("No further payment action is available.");
  await expect(page.getByRole("button", { name: "Record Payment" })).toHaveCount(0);
});
