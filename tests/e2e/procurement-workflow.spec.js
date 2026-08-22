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
  // The document number is deliberately rendered as a non-link badge, while
  // the explicit row action is the deterministic keyboard/screen-reader path.
  // Use it here instead of relying on a synthetic double-click on a <tr>,
  // which is not consistently delivered by every browser engine.
  await firstPr.getByRole("link", { name: /^Open / }).click();
  await expect(page).toHaveURL(/\/purchase-requests\//);
  await expect(page.getByRole("button", { name: /approve as manager/i })).toBeVisible();
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
  await page.goto("/purchase-requests?status=manager_review&search=E2E-PR-MANAGER-REJECT");
  const firstPr = page.locator("tbody tr").filter({ hasText: "E2E-PR-MANAGER-REJECT" });
  await expect(firstPr).toBeVisible();
  await firstPr.dblclick();
  await expect(page).toHaveURL(/\/purchase-requests\//);
  const rejectTrigger = page.getByRole("button", { name: "Reject request", exact: true }).first();
  await expect(rejectTrigger).toBeVisible();
  await rejectTrigger.click();
  const rejectDialog = page.getByRole("dialog");
  await expect(rejectDialog).toBeVisible();
  await rejectDialog.locator('textarea[name="remarks"]').fill("E2E workflow reject smoke");
  await rejectDialog.getByRole("button", { name: "Reject request", exact: true }).click();
  await expect(page.locator("body")).toContainText(/rejected/i);
  await expect(page.getByRole("button", { name: /manager approve/i })).toHaveCount(0);
  await expect(page.locator("body")).toContainText(/rejected/i);
});
