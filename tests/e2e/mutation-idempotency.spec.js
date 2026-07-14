const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("PR create shows pending feedback and redirects once", async ({ page }) => {
  test.skip(process.env.TEST_MUTATE_PR !== "true", "Set TEST_MUTATE_PR=true with a disposable PR fixture to run this mutation test.");
  test.skip(!process.env.TEST_PR_ITEM_LABEL, "Set TEST_PR_ITEM_LABEL to an exact active item label for the disposable PR fixture.");
  test.skip(!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD, "Missing admin test credentials.");
  expect(await login(page, "admin")).toBe(true);
  await page.goto("/purchase-requests/new");
  await page.locator('input[list="purchase-request-items"]').fill(process.env.TEST_PR_ITEM_LABEL);
  await page.locator('input[name="line_qty"]').fill("1");
  await page.getByRole("button", { name: /submit pr/i }).click({ clickCount: 2 });
  await expect(page.getByRole("button", { name: /creating/i })).toBeDisabled();
  await expect(page).toHaveURL(/\/purchase-requests\/[0-9a-f-]{36}/i);
});
