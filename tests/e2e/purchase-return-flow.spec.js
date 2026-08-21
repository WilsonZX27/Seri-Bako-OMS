const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("purchase return posts one supplier return stock movement", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(process.env.TEST_MUTATE_WORKFLOW !== "true", "Set TEST_MUTATE_WORKFLOW=true to run the purchase return mutation workflow.");
  expect(await login(page, "purchasing")).toBe(true);

  if (process.env.TEST_PURCHASE_RETURN_NO) {
    await page.goto(`/purchase-returns?search=${encodeURIComponent(process.env.TEST_PURCHASE_RETURN_NO)}`);
    await page.locator("tbody tr").filter({ hasText: process.env.TEST_PURCHASE_RETURN_NO }).dblclick();
  } else {
    await page.goto("/purchase-returns/new");
    const grnSelect = page.getByLabel("Posted GRN", { exact: false });
    const grnValue = await grnSelect.locator('option').filter({ hasText: /E2E-GRN-INVOICE-OPEN/ }).first().getAttribute("value");
    expect(grnValue, "The deterministic returnable GRN fixture must be available").toBeTruthy();
    await grnSelect.selectOption(grnValue);
    await page.waitForURL(/grn_id=/);
    await page.locator('input[name="line_return_qty"]').first().fill("1");
    await page.locator('select[name="reason"]').selectOption("Supplier return");
    await page.locator('input[name="line_reason"]').first().fill("Safe-gated supplier return");
    await page.getByRole("button", { name: "Create Draft Return" }).click();
    await expect(page).toHaveURL(/\/purchase-returns\/[0-9a-f-]+$/, { timeout: 45_000 });
  }

  const returnNo = (await page.locator("main").getByText(/^PRT(?:\/|-)/).first().innerText()).trim();
  await expect(page.locator("main")).toContainText("Local E2E Invoice Supplier");
  await page.reload();
  await expect(page.locator("main")).toContainText(returnNo);

  const post = page.getByRole("button", { name: "Post return", exact: true });
  await expect(post).toBeVisible();
  await post.click();
  await expect(post).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator("main")).toContainText("Posted");
  await page.reload();
  await expect(page.getByRole("button", { name: "Post return" })).toHaveCount(0);

  await page.goto(`/stock-transactions?search=${encodeURIComponent(returnNo)}`);
  await expect(page.locator("tbody tr").filter({ hasText: /return to supplier/i })).toHaveCount(1);
});
