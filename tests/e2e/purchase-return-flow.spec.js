const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("purchase return posts one supplier return stock movement", async ({ page }) => {
  test.skip(process.env.TEST_MUTATE_WORKFLOW !== "true", "Set TEST_MUTATE_WORKFLOW=true to run the purchase return mutation workflow.");
  expect(await login(page, "admin")).toBe(true);

  if (process.env.TEST_PURCHASE_RETURN_NO) {
    await page.goto(`/purchase-returns?search=${encodeURIComponent(process.env.TEST_PURCHASE_RETURN_NO)}`);
    await page.locator("tbody tr").filter({ hasText: process.env.TEST_PURCHASE_RETURN_NO }).dblclick();
  } else {
    await page.goto("/purchase-returns/new");
    await page.locator('select').selectOption({ label: /GRN-00004/ });
    await page.waitForURL(/grn_id=/);
    await page.locator('input[name="line_return_qty"]').first().fill("1");
    await page.locator('input[name="reason"]').fill("Safe-gated supplier return");
    await page.getByRole("button", { name: "Create Draft Return" }).click();
    await expect(page).toHaveURL(/\/purchase-returns\/[0-9a-f-]+$/);
  }

  const returnNo = (await page.locator("main").getByText(/^PRT-/).first().innerText()).trim();
  await expect(page.locator("main")).toContainText("YOONGHEN");
  await page.reload();
  await expect(page.locator("main")).toContainText(returnNo);

  const post = page.getByRole("button", { name: "Post return" });
  if (await post.count()) await post.click();
  await expect(page.locator("main")).toContainText("Posted");
  await page.reload();
  await expect(page.getByRole("button", { name: "Post return" })).toHaveCount(0);

  await page.goto(`/stock-transactions?search=${encodeURIComponent(returnNo)}`);
  await expect(page.locator("tbody tr").filter({ hasText: "return to supplier" })).toHaveCount(1);
});
