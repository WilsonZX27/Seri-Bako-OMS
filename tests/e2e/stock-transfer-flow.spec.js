const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("stock transfer dispatches and receives exactly once", async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(process.env.TEST_MUTATE_WORKFLOW !== "true", "Set TEST_MUTATE_WORKFLOW=true to run the stock mutation workflow.");
  expect(await login(page, "superAdmin")).toBe(true);

  await page.goto("/stock-balance?search=QA-ING-A-721A&view=branch");
  let stockRows = page.locator("tbody tr").filter({ hasText: "QA-ING-A-721A" });
  let itemCode = "QA-ING-A-721A";
  if (!(await stockRows.count())) {
    await page.goto("/stock-balance?view=branch");
    stockRows = page.locator("tbody tr").filter({ has: page.locator("td") });
    itemCode = (await stockRows.first().locator("td").nth(2).innerText()).trim();
  }
  const sourceRow = stockRows.filter({ hasText: /[1-9][\d,.]*\s+[A-Z]+/ }).first();
  let sourceBranch = (await sourceRow.locator("td").nth(4).innerText()).trim();
  let transferId;
  const testRemark = `Sprint 7.2.24 core transfer QA ${Date.now()}`;

  if (process.env.TEST_TRANSFER_NO) {
    await page.goto(`/stock-transfers?search=${encodeURIComponent(process.env.TEST_TRANSFER_NO)}`);
    await page.locator("tbody tr").filter({ hasText: process.env.TEST_TRANSFER_NO }).dblclick();
    transferId = new URL(page.url()).pathname.split("/").pop();
  } else {

  await page.goto(`/stock-transfers?search=${encodeURIComponent(testRemark)}`);
  const existing = page.locator("tbody tr").filter({ hasText: testRemark });
  if (await existing.count()) {
    await existing.first().dblclick();
    transferId = new URL(page.url()).pathname.split("/").pop();
  } else {
    await page.goto("/stock-transfers/new");
    const fromSelect = page.locator('select[name="from_branch_id"]');
    await fromSelect.selectOption({ index: 0 });
    sourceBranch = (await fromSelect.locator("option:checked").innerText()).trim();
    await page.waitForURL(/from_branch_id=/);
    const destination = page.locator('select[name="to_branch_id"]');
    const destinationBranch = await destination.locator("option").evaluateAll((options, from) => options.find((option) => option.textContent.trim() !== from)?.textContent.trim(), sourceBranch);
    await destination.selectOption({ label: destinationBranch });
    const itemRow = page.locator(".divide-y > div").filter({ hasText: itemCode }).first();
    await expect(itemRow).toBeVisible();
    await page.locator('input[name="line_enabled"]:checked').uncheck();
    await itemRow.locator('input[name="line_enabled"]').check();
    await itemRow.locator('input[name="line_quantity"]').fill("1");
    await page.locator('textarea[name="remarks"]').fill(testRemark);
    await page.getByRole("button", { name: "Save Transfer Draft" }).click();
    // Number allocation and the atomic create RPC can take a few seconds on a cold local stack.
    // Wait for the server-action redirect instead of treating the pending state as a failure.
    await expect(page).toHaveURL(/\/stock-transfers\/[0-9a-f-]+$/, { timeout: 30000 });
    transferId = new URL(page.url()).pathname.split("/").pop();
  }
  }

  const transferNo = (await page.locator("main").getByText(/^ST(?:-|\/)/).first().innerText()).trim();
  const destinationBranch = (await page.getByText("To", { exact: true }).locator("..").locator("p").nth(1).innerText()).trim();
  await expect(page.locator("main")).toContainText(itemCode);
  await page.reload();
  await expect(page.locator("main")).toContainText(testRemark);
  await page.goto(`/stock-transfers/${transferId}`);
  await expect(page.getByRole("button", { name: "Move to In Transit" })).toHaveCount(1);

  if (await page.getByRole("button", { name: "Move to In Transit" }).count()) {
    await page.getByRole("button", { name: "Move to In Transit" }).click();
    await expect(page.getByRole("button", { name: "Confirm received quantities" }).first()).toBeVisible({ timeout: 15000 });
  }
  await page.goto(`/stock-transfers/${transferId}`);
  await page.locator('input[name="receipt_quantity"]').first().fill("1");
  await page.getByRole("button", { name: "Confirm received quantities" }).first().click();
  await expect(page.getByRole("button", { name: "Receiving..." })).toHaveCount(0, { timeout: 30000 });
  await page.goto(`/stock-transfers/${transferId}?fresh=${Date.now()}`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/stock-transfers\/[0-9a-f-]+\?fresh=/);
  await expect(page.getByRole("button", { name: "Confirm received quantities" })).toHaveCount(0);
  await expect(page.locator("main")).toContainText("Completed");
});
