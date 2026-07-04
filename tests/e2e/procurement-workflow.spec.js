const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("manager can open manager approval queue", async ({ page }) => {
  test.skip(!process.env.TEST_MANAGER_EMAIL || !process.env.TEST_MANAGER_PASSWORD, "Missing manager test credentials.");
  expect(await login(page, "manager")).toBe(true);
  await page.goto("/purchase-requests?step=pending_approval");
  await expect(page.getByRole("heading", { name: /purchase requests/i })).toBeVisible();
  await expect(page).toHaveURL(/step=pending_approval/);
});

test("manager dashboard shows and opens manager approval PR", async ({ page }) => {
  test.skip(!process.env.TEST_MANAGER_EMAIL || !process.env.TEST_MANAGER_PASSWORD, "Missing manager test credentials.");
  expect(await login(page, "manager")).toBe(true);
  await expect(page.getByRole("heading", { name: /pending actions/i })).toBeVisible();
  await expect(page.getByText("PR-00008")).toBeVisible();
  await page.getByText("PR-00008").click();
  await expect(page).toHaveURL(/\/purchase-requests\//);
  await expect(page.getByRole("button", { name: /manager approve/i })).toBeVisible();
});

test("purchasing can open purchasing review queue", async ({ page }) => {
  test.skip(!process.env.TEST_PURCHASING_EMAIL || !process.env.TEST_PURCHASING_PASSWORD, "Missing purchasing test credentials.");
  expect(await login(page, "purchasing")).toBe(true);
  await page.goto("/purchase-requests?step=purchasing_review");
  await expect(page.getByRole("heading", { name: /purchase requests/i })).toBeVisible();
});

test("manager reject action refreshes workflow state when mutation smoke is enabled", async ({ page }) => {
  test.skip(process.env.TEST_MUTATE_WORKFLOW !== "true", "Set TEST_MUTATE_WORKFLOW=true to run destructive workflow mutation smoke.");
  test.skip(!process.env.TEST_MANAGER_EMAIL || !process.env.TEST_MANAGER_PASSWORD, "Missing manager test credentials.");
  expect(await login(page, "manager")).toBe(true);
  await page.goto("/purchase-requests?step=pending_approval");
  const firstPr = page.locator("tbody tr").first();
  await expect(firstPr).toBeVisible();
  await firstPr.dblclick();
  await expect(page).toHaveURL(/\/purchase-requests\//);
  await page.getByPlaceholder(/rejection remarks/i).fill("E2E workflow reject smoke");
  await page.getByRole("button", { name: /^reject$/i }).click();
  await expect(page.locator("body")).toContainText(/rejected by manager/i);
  await expect(page.getByRole("button", { name: /manager approve/i })).toHaveCount(0);
  await expect(page.locator("body")).toContainText(/rejected/i);
});
