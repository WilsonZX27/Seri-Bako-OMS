const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { login, logout, missingAccountVars } = require("./helpers");

const screenshotDir = path.join(process.cwd(), "test-results", "ui-smoke-sprint-7-2-3");

const superAdminRoutes = [
  "/dashboard",
  "/daily-operations",
  "/procurement",
  "/procurement/purchase-requests",
  "/purchase-requests",
  "/purchase-requests/new",
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

async function assertSprint721Rules(page, route) {
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
      const searchCenter = searchBox.x + searchBox.width / 2;
      const headerCenter = headerBox.x + headerBox.width / 2;
      expect(Math.abs(searchCenter - headerCenter), "topbar search should stay centered within the content header").toBeLessThan(60);
      expect(searchBox.x + searchBox.width, "topbar search must not overlap account area").toBeLessThanOrEqual(accountBox.x);
    }
    await expect(page.getByRole("heading", { name: /pending actions/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /operational status/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /finance forecast/i })).toBeVisible();
  }
  if (route === "/settings") {
    await expect(page.getByRole("link", { name: /data onboarding/i })).toBeVisible();
  }
  if (route === "/procurement") {
    const titles = [/requesting/i, /ordering/i, /receiving/i, /supplier master data/i];
    const boxes = [];
    for (const title of titles) {
      const box = await page.getByRole("heading", { name: title }).boundingBox();
      expect(box, `${title} section heading must be visible`).toBeTruthy();
      boxes.push(box);
    }
    const rows = new Set(boxes.map((box) => Math.round(box.y / 10)));
    expect(rows.size, "procurement sections should sit in one desktop row").toBe(1);
  }
  if (route === "/documents") {
    await expect(page.locator("table thead")).not.toContainText(/action/i);
    await expect(page.locator('table a', { hasText: /^Open$/ })).toHaveCount(0);
    await expect(page.getByText(/double-click any row/i)).toBeVisible();
  }
  if (route === "/purchase-requests") {
    await expect(page.locator('table a[aria-label^="Quick view"]').first()).toBeAttached();
  }
  if (route === "/purchase-requests/new") {
    await assertNoObviousVisualBreaks(page);
  }
  if (route === "/inventory") {
    await expect(page.locator("body")).not.toContainText("Recent Transactions");
  }
  if (route === "/daily-operations") {
    await expect(page.getByRole("heading", { name: /today's work/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /scan \/ count \/ receive/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /report exception/i })).toBeVisible();
  }
  if (route === "/staffs/new") {
    await expect(page.locator('select[name="role_id"] option', { hasText: "Super Admin / Owner" })).toHaveCount(0);
  }
}

test.beforeAll(() => {
  fs.mkdirSync(screenshotDir, { recursive: true });
});

test("super admin UI smoke screenshots", async ({ page }) => {
  test.setTimeout(180_000);
  ensureSmokeEnv("superAdmin");
  expect(await login(page, "superAdmin")).toBe(true);

  for (const route of superAdminRoutes) {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("body")).not.toContainText(/404:|Application error|Unhandled Runtime Error/i);
    await assertNoObviousVisualBreaks(page);
    await assertSprint721Rules(page, route);
    await page.screenshot({ path: path.join(screenshotDir, `${screenshotName(route)}.png`), fullPage: true });
  }
});

for (const role of roles) {
  test(`${role} dashboard and sidebar smoke`, async ({ page }) => {
    test.setTimeout(75_000);
    ensureSmokeEnv(role);
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
