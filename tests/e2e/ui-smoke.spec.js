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
  "/staffs",
  "/staffs/new",
  "/account",
  "/activity",
];

const roles = ["kitchen", "purchasing", "manager", "finance", "outlet"];

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
  await expect(page.locator("body")).not.toContainText("Search by item image");
}

async function assertSprint731Rules(page, route) {
  if (route === "/dashboard") {
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
    await expect(page.getByRole("heading", { name: /owner workdesk/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /actions awaiting you/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /operational pipeline/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /exceptions requiring follow-up/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /payables and cash obligations/i })).toBeVisible();
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
    await expect(page.locator("table thead th").filter({ hasText: /^Action$/i }).first()).toBeVisible();
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
    await expect(page.locator('nav a', { hasText: "Purchasing Review" })).toHaveCount(0);
    await expect(page.locator('nav a', { hasText: "Finance Review" })).toHaveCount(0);
    await expect(page.locator('nav a', { hasText: "Outlet Requests" })).toHaveCount(0);
    await expect(page.locator('nav a', { hasText: "Supplier Sending" })).toHaveCount(0);
    await expect(page.locator("table thead th").filter({ hasText: /^Action$/i }).first()).toBeVisible();
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
    const console = page.locator("[data-right-console]");
    await expect(console).toContainText("Attention summary");
    await expect(console).toContainText("Control basis");
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
  // The local Next preview compiles each of the canonical route bundles on
  // first visit; keep the audit bound generous enough to report UI failures
  // instead of timing out while the dev server is still warming.
  test.setTimeout(420_000);
  test.skip(!hasAccount("superAdmin"), `Missing super admin test credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  if (!process.env.TEST_BASE_URL) {
    throw new Error("Missing required UI smoke env variable: TEST_BASE_URL");
  }
  expect(await login(page, "superAdmin")).toBe(true);

  for (const route of superAdminRoutes) {
    try {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 });
    } catch (error) {
      if (!/net::ERR_ABORTED|frame was detached/i.test(String(error))) throw error;
      await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
    }
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
    await page.locator("aside:visible").first().screenshot({ path: path.join(screenshotDir, `${role}-sidebar.png`) });

    await logout(page);
  });
}
