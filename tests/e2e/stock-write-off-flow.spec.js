const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("stock write-off posts one outbound wastage movement", async ({ page }) => {
  test.skip(process.env.TEST_MUTATE_WORKFLOW !== "true", "Set TEST_MUTATE_WORKFLOW=true to run the stock write-off mutation workflow.");
  expect(await login(page, "purchasing")).toBe(true);

  if (process.env.TEST_WASTAGE_NO) {
    await page.goto(`/stock-wastage?search=${encodeURIComponent(process.env.TEST_WASTAGE_NO)}`);
    await page.locator("tbody tr").filter({ hasText: process.env.TEST_WASTAGE_NO }).dblclick();
  } else {
    await page.goto("/stock-wastage/new");
    await page.locator('select[name="branch_id"]').selectOption({ label: "Central Kitchen @ PJS10" });
    await page.waitForURL(/branch_id=/);
    await page.locator("label").filter({ hasText: "QA Ingredient A 7.2.21A" }).locator('input[name="line_enabled"]').check();
    await page.locator("div").filter({ hasText: "QA Ingredient A 7.2.21A" }).locator('input[name="line_quantity"]').fill("1");
    await page.locator('select[name="reason"]').selectOption("damaged");
    await page.locator('textarea[name="remarks"]').fill("Safe-gated stock write-off QA");
    await page.getByRole("button", { name: "Create wastage" }).click();
    await expect(page).toHaveURL(/\/stock-wastage\/[0-9a-f-]+$/);
  }

  const wastageNo = (await page.locator("main").getByText(/^(WST|SW)-/).first().innerText()).trim();
  await expect(page.locator("main")).toContainText("QA Ingredient A 7.2.21A");
  await page.reload();
  await expect(page.locator("main")).toContainText(wastageNo);

  const post = page.getByRole("button", { name: "Post wastage" });
  if (await post.count()) await post.click();
  await expect(page.locator("main")).toContainText("Posted");
  await page.reload();
  await expect(page.getByRole("button", { name: "Post wastage" })).toHaveCount(0);

  await page.goto(`/stock-transactions?search=${encodeURIComponent(wastageNo)}`);
  await expect(page.locator("tbody tr").filter({ hasText: "wastage" })).toHaveCount(1);
});
