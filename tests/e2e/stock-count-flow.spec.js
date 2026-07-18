const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("stock count posts one variance adjustment exactly once", async ({ page }) => {
  test.skip(process.env.TEST_MUTATE_WORKFLOW !== "true", "Set TEST_MUTATE_WORKFLOW=true to run the stock mutation workflow.");
  expect(await login(page, "purchasing")).toBe(true);

  if (process.env.TEST_STOCK_COUNT_NO) {
    await page.goto(`/stock-counts?search=${encodeURIComponent(process.env.TEST_STOCK_COUNT_NO)}`);
    await page.locator("tbody tr").filter({ hasText: process.env.TEST_STOCK_COUNT_NO }).dblclick();
  } else {
    await page.goto("/stock-balance?search=QA-ING-A-721A&view=branch");
    const sourceRow = page.locator("tbody tr").filter({ hasText: "Central Kitchen @ PJS10" }).first();
    await expect(sourceRow).toBeVisible();
    const beforeQty = Number((await sourceRow.locator("td").nth(8).innerText()).replace(/[^\d.-]/g, ""));

    await page.goto("/stock-counts/new");
    await page.locator('select[name="branch_id"]').selectOption({ label: "Central Kitchen @ PJS10" });
    await page.waitForURL(/branch_id=/);
    await page.locator('input[name="line_physical_qty"]').fill(String(beforeQty + 1));
    await page.locator('input[name="line_remarks"]').fill("Safe-gated stock count variance");
    await page.locator('textarea[name="remarks"]').fill("Safe-gated stock count workflow");
    await page.getByRole("button", { name: "Create draft count" }).click();
    await expect(page).toHaveURL(/\/stock-counts\/[0-9a-f-]+$/);
  }

  const countNo = (await page.locator("main").getByText(/^SC-/).first().innerText()).trim();
  await expect(page.locator("main")).toContainText("QA-ING-A-721A");
  await page.reload();
  await expect(page.locator("main")).toContainText(countNo);

  for (const action of ["Submit", "Review", "Approve", "Post variance"]) {
    const button = page.getByRole("button", { name: action });
    if (await button.count()) await button.click();
  }

  await expect(page.locator("main")).toContainText("Posted");
  await page.reload();
  await expect(page.getByRole("button", { name: "Post variance" })).toHaveCount(0);

  await page.goto(`/stock-transactions?search=${encodeURIComponent(countNo)}`);
  await expect(page.locator("tbody tr").filter({ hasText: "stock count adjustment" })).toHaveCount(1);
});
