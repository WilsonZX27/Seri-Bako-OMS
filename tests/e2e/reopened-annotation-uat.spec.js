const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

async function expectNoPageOverflow(page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(5);
}

test("dashboard workspace updates do not repeat the main pending-action queue", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Missing super-admin test credentials.");
  await page.setViewportSize({ width: 1180, height: 820 });
  await login(page, "superAdmin");
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Actions awaiting you", { exact: true })).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: /open workspace updates/i }).click();
  const updates = page.getByRole("dialog", { name: "Workspace Updates" });
  await expect(updates).toBeVisible();
  await expect(updates.getByText("MY PENDING ACTIONS", { exact: true })).toHaveCount(0);
  await expect(updates).toContainText(/Notifications and recent activity/i);
  await expectNoPageOverflow(page);
});

test("portrait tablet outlet workspace keeps its rail and a full-width chart", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Missing super-admin test credentials.");
  await page.setViewportSize({ width: 820, height: 1180 });
  await login(page, "superAdmin");
  await page.goto("/outlet-daily-records", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Outlet Daily Records", exact: true })).toBeVisible({ timeout: 30_000 });

  const workspace = page.locator("[data-tablet-document-split]").first();
  const rail = workspace.locator(":scope > aside");
  await expect(rail).toBeVisible();
  const panel = page.locator("[data-outlet-wastage-chart-panel]");
  const chart = panel.locator("svg").first();
  await expect(chart, "Run setup-local-dashboard-e2e.mjs --annotation-fixture before this suite.").toBeVisible();

  const [workspaceBox, railBox, panelBox, chartBox] = await Promise.all([
    workspace.boundingBox(),
    rail.boundingBox(),
    panel.boundingBox(),
    chart.boundingBox(),
  ]);
  expect(railBox.width).toBeGreaterThanOrEqual(180);
  expect(railBox.x).toBeGreaterThan(workspaceBox.x + 300);
  expect(chartBox.width / panelBox.width).toBeGreaterThan(0.9);
  await expectNoPageOverflow(page);
});

test("mobile compliance detail keeps the app navigation and no synthetic More actions rail", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Missing super-admin test credentials.");
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "superAdmin");
  await page.goto("/outlet-compliance", { waitUntil: "domcontentloaded" });
  await page.getByRole("listitem", { name: "Open Local E2E Outlet" }).dblclick();
  await expect(page.getByRole("heading", { name: "Compliance checklist" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-mobile-action-bar]")).toHaveCount(0);
  await expect(page.locator("[data-mobile-bottom-nav]")).toBeVisible();
  await expectNoPageOverflow(page);
});

test("staff register uses grouped columns without desktop overflow", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Missing super-admin test credentials.");
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "superAdmin");
  await page.goto("/staffs", { waitUntil: "domcontentloaded" });
  const table = page.locator("table.sb-staff-table");
  await expect(table).toBeVisible({ timeout: 30_000 });
  await expect(table.locator("thead th")).toHaveText(["Action", "Staff", "Assignment", "Status"]);
  const firstRow = table.locator("tbody tr").first();
  await expect(firstRow.locator("td")).toHaveCount(4);
  await expectNoPageOverflow(page);
});

test("purchase request validation points to the exact field before any record is created", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Missing super-admin test credentials.");
  await page.setViewportSize({ width: 1180, height: 820 });
  await login(page, "superAdmin");
  await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });

  const supplier = page.getByLabel("Request supplier");
  await expect(supplier).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Submit PR" }).click();
  await expect(supplier).toBeFocused();
  await expect(supplier).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Choose one supplier for this purchase request.", { exact: true })).toBeVisible();

  const availableSuppliers = await supplier.locator("option").evaluateAll((options) =>
    options.map((option) => option.value).filter(Boolean),
  );
  test.skip(availableSuppliers.length === 0, "No active supplier is available for the default branch fixture.");
  await supplier.selectOption(availableSuppliers[0]);
  await page.getByRole("button", { name: "Submit PR" }).click();

  const firstItem = page.getByLabel("Item for request line 1");
  await expect(firstItem).toBeFocused();
  await expect(firstItem).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Complete this line before continuing.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/purchase-requests\/new/);
  await expectNoPageOverflow(page);
});
