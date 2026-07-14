const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { hasAccount, login, logout, missingAccountVars } = require("./helpers");

const screenshotDir = path.join(process.cwd(), "test-results", "ui-smoke-sprint-7-3-1");

const superAdminRoutes = [
  "/dashboard",
  "/purchase-requests",
  "/purchase-requests/new",
  "/purchase-orders",
  "/inventory",
  "/items",
  "/items/new",
  "/suppliers",
  "/suppliers/new",
  "/stock-transactions",
  "/stock-balance",
  "/stock-card",
  "/production",
  "/production/jobs",
  "/production/jobs/new",
  "/documents",
  "/data-onboarding",
  "/settings",
  "/staffs",
  "/staffs/new",
  "/account",
  "/settings/backups",
  "/activity",
];

const roles = ["kitchen", "purchasing", "manager", "finance", "admin"];

function ensureSmokeEnv(role) {
  const missing = role ? missingAccountVars(role) : [];
  if (missing.length) {
    throw new Error(`Missing required UI smoke env variable(s): ${missing.join(", ")}`);
  }
  if (!process.env.TEST_BASE_URL) {
    throw new Error("Missing required UI smoke env variable: TEST_BASE_URL");
  }
}

function screenshotName(label) {
  return label.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

async function assertNoObviousVisualBreaks(page) {
  const overflow = await page.evaluate(() => ({
    ok: document.documentElement.scrollWidth <= window.innerWidth + 5,
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    url: window.location.pathname,
  }));
  expect(overflow.ok, `${overflow.url} must not have horizontal overflow (${overflow.scrollWidth}px > ${overflow.width}px)`).toBe(true);
  await expect(page.locator("body")).not.toContainText("USB Scanner");
  await expect(page.locator("body")).not.toContainText("Search by item image");
}

async function assertSprint731Rules(page, route) {
  if (route === "/dashboard") {
    await expect(page.locator('nav a[href="/data-onboarding"]')).toHaveCount(0);
    await expect(page.getByTestId("topbar-search-region")).toHaveCount(1, { timeout: 5_000 });
    await expect(page.getByTestId("topbar-account-region")).toHaveCount(1, { timeout: 5_000 });
    const searchBox = await page.getByTestId("topbar-search-region").boundingBox();
    const accountBox = await page.getByTestId("topbar-account-region").boundingBox();
    const headerBox = await page.locator("header").first().boundingBox();
    expect(searchBox, "topbar search must be visible on desktop").toBeTruthy();
    expect(accountBox, "topbar account region must be visible on desktop").toBeTruthy();
    expect(headerBox, "topbar header must be visible on desktop").toBeTruthy();
    if (searchBox && accountBox && headerBox) {
      expect(searchBox.x, "topbar search belongs in the right action cluster").toBeGreaterThan(headerBox.x + headerBox.width / 2);
      expect(searchBox.x + searchBox.width, "topbar search must fit within the right action cluster").toBeLessThanOrEqual(accountBox.x + accountBox.width);
    }
    await expect(page.getByRole("heading", { name: /operations dashboard/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /today's attention/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /procurement queue/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /today’s operations/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /stock exceptions/i })).toBeVisible();
  }
  if (route === "/settings") {
    await expect(page.getByRole("link", { name: /data onboarding/i })).toBeVisible();
  }
  if (route === "/procurement") {
    const titles = ["Requesting", "Ordering", "Receiving", "Supplier Master Data"];
    const boxes = [];
    for (const title of titles) {
      const box = await page.getByRole("heading", { name: title, exact: true }).boundingBox();
      expect(box, `${title} section heading must be visible`).toBeTruthy();
      boxes.push(box);
    }
    const rows = new Set(boxes.map((box) => Math.round(box.y / 10)));
    expect(rows.size, "procurement sections should sit in one desktop row").toBe(1);
  }
  if (route === "/documents") {
    const tableHead = page.locator("table thead");
    await expect(tableHead).not.toContainText(/title/i);
    await expect(tableHead).not.toContainText(/related entity/i);
    await expect(tableHead).not.toContainText(/^approval$/i);
    await expect(tableHead).not.toContainText(/current step/i);
    await expect(page.locator("table thead th").last()).toHaveText(/action/i);
    await expect(page.locator('table a', { hasText: /^Open$/ })).toHaveCount(0);
    await expect(page.locator('select[name="status"]')).toHaveCount(0);
    await expect(page.locator('select[name="approval_status"]')).toHaveCount(0);
    const documentRows = page.locator("table tbody tr[data-href]");
    if (await documentRows.count()) {
      await expect(documentRows.first().locator('a[aria-label^="Open "]')).toBeVisible();
    } else {
      await expect(page.getByText(/no documents found/i)).toBeVisible();
    }
  }
  if (route === "/purchase-requests") {
    await expect(page.locator('nav a', { hasText: "Manager Approvals" })).toHaveCount(0);
    await expect(page.locator('nav a', { hasText: "Admin Review" })).toHaveCount(0);
    await expect(page.locator('nav a', { hasText: "Finance Review" })).toHaveCount(0);
    await expect(page.locator('nav a', { hasText: "Outlet Requests" })).toHaveCount(0);
    await expect(page.locator('nav a', { hasText: "Supplier Sending" })).toHaveCount(0);
    await expect(page.locator("table thead th").last()).toHaveText(/action/i);
    await expect(page.locator("[data-right-console]")).toContainText("Manager Review");
  }
  if (route === "/purchase-orders") {
    await expect(page.locator("[data-right-console]")).toContainText("Ready to Send");
    await expect(page.locator("[data-right-console]")).toContainText("Sent to Supplier");
    await expect(page.locator('nav a', { hasText: "Supplier Sending" })).toHaveCount(0);
  }
  if (route === "/purchase-requests/new") {
    await assertNoObviousVisualBreaks(page);
  }
  if (route === "/inventory") {
    await expect(page.locator("body")).not.toContainText("Recent Transactions");
    await expect(page.locator("body")).not.toContainText(/permission denied for view|42501|Application error/i);
    const rail = page.getByTestId("inventory-insights-rail");
    await expect(rail).toContainText("Quick Insights");
    const railBox = await rail.boundingBox();
    expect(railBox, "Inventory Quick Insights rail must be visible").toBeTruthy();
  }
  if (route === "/reports") {
    await expect(page.locator("body")).not.toContainText("Quick Insights");
    await expect(page.locator("body")).not.toContainText(/Inventory Reports\s+3|Procurement Reports\s+3/);
  }
}

test.beforeAll(() => {
  fs.mkdirSync(screenshotDir, { recursive: true });
});

test("super admin UI smoke screenshots", async ({ page }) => {
  test.setTimeout(180_000);
  test.skip(!hasAccount("superAdmin"), `Missing super admin test credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  if (!process.env.TEST_BASE_URL) {
    throw new Error("Missing required UI smoke env variable: TEST_BASE_URL");
  }
  expect(await login(page, "superAdmin")).toBe(true);

  for (const route of superAdminRoutes) {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(150);
    await expect(page.locator("body")).not.toContainText(/404:|Application error|Unhandled Runtime Error/i);
    await assertNoObviousVisualBreaks(page);
    await assertSprint731Rules(page, route);
    await page.screenshot({ path: path.join(screenshotDir, `${screenshotName(route)}.png`), fullPage: true });
  }
});

for (const role of roles) {
  test(`${role} dashboard and sidebar smoke`, async ({ page }) => {
    test.setTimeout(75_000);
    test.skip(!hasAccount(role), `Missing ${role} test credentials: ${missingAccountVars(role).join(", ")}`);
    if (!process.env.TEST_BASE_URL) {
      throw new Error("Missing required UI smoke env variable: TEST_BASE_URL");
    }
    expect(await login(page, role)).toBe(true);
    await assertNoObviousVisualBreaks(page);
    await page.screenshot({ path: path.join(screenshotDir, `${role}-dashboard.png`), fullPage: true });
    await page.locator("aside, nav").first().screenshot({ path: path.join(screenshotDir, `${role}-sidebar.png`) });

    await page.goto("/settings/backups", { waitUntil: "domcontentloaded" });
    if (role !== "admin") {
      await page.waitForURL((url) => !url.pathname.endsWith("/settings/backups"), { timeout: 10_000 });
    }

    await logout(page);
  });
}
