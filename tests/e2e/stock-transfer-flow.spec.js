const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("stock transfer dispatches and receives exactly once", async ({ page }) => {
  test.skip(process.env.TEST_MUTATE_WORKFLOW !== "true", "Set TEST_MUTATE_WORKFLOW=true to run the stock mutation workflow.");
  expect(await login(page, "admin")).toBe(true);

  await page.goto("/stock-balance?search=QA-ING-A-721A&view=branch");
  let stockRows = page.locator("tbody tr").filter({ hasText: "QA-ING-A-721A" });
  let itemCode = "QA-ING-A-721A";
  if (!(await stockRows.count())) {
    await page.goto("/stock-balance?view=branch");
    stockRows = page.locator("tbody tr").filter({ has: page.locator("td") });
    itemCode = (await stockRows.first().locator("td").nth(2).innerText()).trim();
  }
  const sourceRow = stockRows.filter({ hasText: /[1-9][\d,.]*\s+[A-Z]+/ }).first();
  const sourceBranch = (await sourceRow.locator("td").nth(4).innerText()).trim();
  const sourceBefore = Number((await sourceRow.locator("td").nth(8).innerText()).replace(/[^\d.-]/g, ""));

  if (process.env.TEST_TRANSFER_NO) {
    await page.goto(`/stock-transfers?search=${encodeURIComponent(process.env.TEST_TRANSFER_NO)}`);
    await page.locator("tbody tr").filter({ hasText: process.env.TEST_TRANSFER_NO }).dblclick();
  } else {

  await page.goto("/stock-transfers?search=Sprint%207.2.24%20core%20transfer%20QA");
  const existing = page.locator("tbody tr").filter({ hasText: "Sprint 7.2.24 core transfer QA" });
  if (await existing.count()) {
    await existing.first().dblclick();
  } else {
    await page.goto("/stock-transfers/new");
    await page.locator('select[name="from_branch_id"]').selectOption({ label: sourceBranch });
    await page.waitForURL(/from_branch_id=/);
    const destination = page.locator('select[name="to_branch_id"]');
    const destinationBranch = await destination.locator("option").evaluateAll((options, from) => options.find((option) => option.textContent.trim() !== from)?.textContent.trim(), sourceBranch);
    await destination.selectOption({ label: destinationBranch });
    const itemRow = page.locator(".divide-y > div").filter({ hasText: itemCode }).first();
    await expect(itemRow).toBeVisible();
    await page.locator('input[name="line_enabled"]:checked').uncheck();
    await itemRow.locator('input[name="line_enabled"]').check();
    await itemRow.locator('input[name="line_quantity"]').fill("1");
    await page.locator('textarea[name="remarks"]').fill("Sprint 7.2.24 core transfer QA");
    await page.getByRole("button", { name: "Create transfer" }).click();
    await expect(page).toHaveURL(/\/stock-transfers\/[0-9a-f-]+$/);
  }
  }

  const transferNo = (await page.locator("main").getByText(/^ST-/).first().innerText()).trim();
  const destinationBranch = (await page.getByText("To", { exact: true }).locator("..").locator("p").nth(1).innerText()).trim();
  await expect(page.locator("main")).toContainText(itemCode);
  await page.reload();
  await expect(page.locator("main")).toContainText("Sprint 7.2.24 core transfer QA");
  await page.goto(`/stock-transfers?search=${encodeURIComponent(transferNo)}`);
  await expect(page.locator("tbody tr").filter({ hasText: transferNo })).toHaveCount(1);
  await page.locator("tbody tr").filter({ hasText: transferNo }).dblclick();

  if (await page.getByRole("button", { name: "Move to In Transit" }).count()) await page.getByRole("button", { name: "Move to In Transit" }).click();
  await expect(page.locator("main")).toContainText("In Transit");
  await page.goto(`/stock-transactions?search=${encodeURIComponent(`${transferNo}-out`)}`);
  await expect(page.locator("tbody tr").filter({ hasText: "transfer out" })).toHaveCount(1);
  await expect(page.locator("tbody tr").filter({ hasText: "transfer in" })).toHaveCount(0);

  await page.goto(`/stock-balance?search=${encodeURIComponent(itemCode)}&view=branch`);
  const sourceAfterDispatch = Number((await page.locator("tbody tr").filter({ hasText: sourceBranch }).locator("td").nth(8).innerText()).replace(/[^\d.-]/g, ""));
  expect(sourceAfterDispatch).toBe(sourceBefore - 1);

  await page.goto(`/stock-transfers?search=${encodeURIComponent(transferNo)}`);
  await page.locator("tbody tr").filter({ hasText: transferNo }).dblclick();
  await page.getByRole("button", { name: "Complete transfer" }).click();
  await expect(page.locator("main")).toContainText("Completed");
  await page.reload();
  await expect(page.getByRole("button", { name: "Complete transfer" })).toHaveCount(0);

  await page.goto(`/stock-transactions?search=${encodeURIComponent(transferNo)}`);
  await expect(page.locator("tbody tr").filter({ hasText: "transfer out" })).toHaveCount(1);
  await expect(page.locator("tbody tr").filter({ hasText: "transfer in" })).toHaveCount(1);
});
