const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { login, logout, missingAccountVars } = require("./helpers");

const screenshotDir = path.join(process.cwd(), "test-results", "ui-smoke-sprint-7-2-1");

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
  }
  if (route === "/settings") {
    await expect(page.getByRole("link", { name: /data onboarding/i })).toBeVisible();
  }
  if (route === "/documents") {
    await expect(page.locator("table thead")).not.toContainText(/action/i);
    await expect(page.locator('table a', { hasText: /^Open$/ })).toHaveCount(0);
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
