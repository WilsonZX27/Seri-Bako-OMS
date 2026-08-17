const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("stock write-off posts one outbound wastage movement", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(process.env.TEST_MUTATE_WORKFLOW !== "true", "Set TEST_MUTATE_WORKFLOW=true to run the stock write-off mutation workflow.");
  expect(await login(page, "kitchen")).toBe(true);

  if (process.env.TEST_WASTAGE_NO) {
    await page.goto(`/stock-wastage?search=${encodeURIComponent(process.env.TEST_WASTAGE_NO)}`);
    await page.locator("tbody tr").filter({ hasText: process.env.TEST_WASTAGE_NO }).dblclick();
  } else {
    await page.goto("/stock-wastage/new");
    const itemRow = page.locator("[data-stock-operation-line]").filter({ hasText: "E2E-SC-001" });
    await expect(itemRow).toBeVisible();
    const preselected = page.locator('input[name="line_enabled"]:checked');
    for (let index = (await preselected.count()) - 1; index >= 0; index -= 1) await preselected.nth(index).uncheck();
    const enabled = itemRow.locator('input[name="line_enabled"]');
    if (!(await enabled.isChecked())) await enabled.check();
    await itemRow.locator('input[name="line_quantity"]').fill("1");
    await page.locator('select[name="reason"]').selectOption("damaged");
    await page.locator('textarea[name="remarks"]').fill("Safe-gated stock write-off QA");
    const invalidFields = await page.locator("#stock-wastage-create-form :invalid").evaluateAll((nodes) => nodes.map((node) => ({ name: node.getAttribute("name"), value: node.value, message: node.validationMessage })));
    expect(invalidFields, `Wastage form must be browser-valid before submission: ${JSON.stringify(invalidFields)}`).toEqual([]);
    await page.getByRole("button", { name: "Create wastage" }).click();
    await expect(page).toHaveURL(/\/stock-wastage\/[0-9a-f-]+$/);
  }

  const wastageNo = (await page.locator("main").getByText(/^(?:WST|SW)(?:\/|-)/).first().innerText()).trim();
  await expect(page.locator("main")).toContainText("E2E-SC-001");
  await page.reload();
  await expect(page.locator("main")).toContainText(wastageNo);

  const post = page.getByRole("button", { name: "Post wastage", exact: true });
  await expect(post).toBeVisible();
  await post.click();
  await expect(page.getByRole("button", { name: "Posting..." })).toHaveCount(0, { timeout: 30_000 });
  await page.goto(`${new URL(page.url()).pathname}?fresh=${Date.now()}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Post wastage" })).toHaveCount(0);

  await page.goto(`/stock-transactions?search=${encodeURIComponent(wastageNo)}`);
  await expect(page.locator("tbody tr").filter({ hasText: "wastage" })).toHaveCount(1);
});
