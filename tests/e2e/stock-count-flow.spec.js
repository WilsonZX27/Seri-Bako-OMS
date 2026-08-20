const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("stock count posts one variance adjustment exactly once", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(process.env.TEST_MUTATE_WORKFLOW !== "true", "Set TEST_MUTATE_WORKFLOW=true to run the stock mutation workflow.");
  expect(await login(page, "kitchen")).toBe(true);

  if (process.env.TEST_STOCK_COUNT_NO) {
    await page.goto(`/stock-counts?search=${encodeURIComponent(process.env.TEST_STOCK_COUNT_NO)}`);
    await page.locator("tbody tr").filter({ hasText: process.env.TEST_STOCK_COUNT_NO }).dblclick();
  } else {
    await page.goto("/stock-counts/new");
    const itemRow = page.locator("[data-stock-count-line]").filter({ hasText: "E2E-SC-001" });
    await expect(itemRow).toBeVisible();
    const theoreticalQty = Number(await itemRow.locator('input[name="line_theoretical_qty"]').inputValue());
    await itemRow.locator('input[name="line_physical_qty"]').fill(String(theoreticalQty + 1));
    await page.locator('textarea[name="remarks"]').fill("Safe-gated stock count workflow");
    await page.getByRole("button", { name: "Save draft", exact: true }).first().click();
    await expect(page).toHaveURL(/\/stock-counts\/[0-9a-f-]+$/);
  }

  const countNo = (await page.locator("main").getByText(/^SC(?:\/|-)/).first().innerText()).trim();
  await expect(page.locator("main")).toContainText("E2E-SC-001");
  await page.reload();
  await expect(page.locator("main")).toContainText(countNo);

  const postTrigger = page.getByRole("button", { name: "Confirm & Post Count", exact: true }).filter({ visible: true }).first();
  await expect(postTrigger).toBeVisible();
  await postTrigger.click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm & Post Count", exact: true }).click();
  await expect(postTrigger).toHaveCount(0, { timeout: 30_000 });
  await page.reload();
  await expect(page.getByRole("button", { name: "Confirm & Post Count" })).toHaveCount(0);

  await page.goto(`/stock-transactions?search=${encodeURIComponent(countNo)}`);
  const targetAdjustment = page.locator("tbody tr").filter({ hasText: /stock count adjustment/i }).filter({ hasText: "E2E-SC-001" });
  await expect(targetAdjustment).toHaveCount(1);
});
