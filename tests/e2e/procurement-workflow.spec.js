const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("manager can open manager review filter", async ({ page }) => {
  test.skip(!process.env.TEST_MANAGER_EMAIL || !process.env.TEST_MANAGER_PASSWORD, "Missing manager test credentials.");
  expect(await login(page, "manager")).toBe(true);
  await page.goto("/purchase-requests?status=manager_review");
  await expect(page.getByRole("heading", { name: /purchase requests/i })).toBeVisible();
  await expect(page).toHaveURL(/status=manager_review/);
});

test("manager opens a manager approval PR", async ({ page }) => {
  test.skip(!process.env.TEST_MANAGER_EMAIL || !process.env.TEST_MANAGER_PASSWORD, "Missing manager test credentials.");
  expect(await login(page, "manager")).toBe(true);
  await page.goto("/purchase-requests?status=manager_review");
  test.skip(await page.getByText(/No (purchase requests found|requests match these filters)/i).first().isVisible(), "No live Manager Review PR fixture is available.");
  const firstPr = page.locator("tbody tr").first();
  await expect(firstPr).toBeVisible();
  await firstPr.getByRole("link", { name: /^PR-/ }).click();
  await expect(page).toHaveURL(/\/purchase-requests\//);
  await expect(page.getByRole("button", { name: /manager approve/i })).toBeVisible();
});

test("Purchasing can open purchasing review filter", async ({ page }) => {
  test.skip(!process.env.TEST_PURCHASING_EMAIL || !process.env.TEST_PURCHASING_PASSWORD, "Missing Purchasing test credentials.");
  expect(await login(page, "purchasing")).toBe(true);
  await page.goto("/purchase-requests?status=admin_review");
  await expect(page.getByRole("heading", { name: /purchase requests/i })).toBeVisible();
});

test("manager reject action refreshes workflow state when mutation smoke is enabled", async ({ page }) => {
  test.skip(process.env.TEST_MUTATE_WORKFLOW !== "true", "Set TEST_MUTATE_WORKFLOW=true to run destructive workflow mutation smoke.");
  test.skip(!process.env.TEST_MANAGER_EMAIL || !process.env.TEST_MANAGER_PASSWORD, "Missing manager test credentials.");
  expect(await login(page, "manager")).toBe(true);
  await page.goto("/purchase-requests?status=manager_review");
  const firstPr = page.locator("tbody tr").first();
  await expect(firstPr).toBeVisible();
  await firstPr.dblclick();
  await expect(page).toHaveURL(/\/purchase-requests\//);
  await page.getByPlaceholder(/rejection remarks/i).fill("E2E workflow reject smoke");
  await page.getByRole("button", { name: /^reject$/i }).click();
  await expect(page.locator("body")).toContainText(/rejected/i);
  await expect(page.getByRole("button", { name: /manager approve/i })).toHaveCount(0);
  await expect(page.locator("body")).toContainText(/rejected/i);
});
