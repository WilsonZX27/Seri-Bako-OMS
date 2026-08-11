const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { hasAccount, requireAccount } = require("./helpers");

const roles = ["superAdmin", "finance", "manager", "purchasing", "kitchen", "outlet"];
const evidence = path.join(process.cwd(), "test-results", "sprint-7-23-2");

async function signIn(page, role) {
  const credentials = requireAccount(role);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 20_000 });
}

test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));

for (const role of roles) {
  test(`${role} receives a scoped terminal dashboard`, async ({ page }) => {
    test.setTimeout(90_000);
    test.skip(!hasAccount(role), `Missing local-only credentials for ${role}.`);
    const critical = [];
    page.on("console", (message) => { if (message.type() === "error") critical.push(message.text()); });
    page.on("pageerror", (error) => critical.push(error.message));
    await signIn(page, role);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator("[data-dashboard-identity]").first()).toContainText(/welcome/i);
    await expect(page.locator("body")).not.toContainText(/Owner Workdesk|Finance Workdesk|Manager Workdesk|Purchasing Workdesk|Kitchen Workdesk|Outlet Today/);
    if (role === "outlet") {
      await expect(page.locator("[data-dashboard-command]")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Today's completion" })).toBeVisible();
      await expect(page.locator("[data-dashboard-quick-actions] a")).toHaveCount(3);
    }

    for (const [width, label] of [[1024, "tablet"], [390, "mobile"]]) {
      await page.setViewportSize({ width, height: 900 });
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator("[data-dashboard-identity]").first()).toContainText(/welcome/i);
      if (role === "outlet") await expect(page.locator("[data-dashboard-command]")).toHaveCount(0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${role} ${label} dashboard must not overflow`).toBeLessThanOrEqual(5);
      await page.screenshot({ path: path.join(evidence, `${roles.indexOf(role) + 1}-${role}-${label}.png`), fullPage: true });
    }

    if (!["superAdmin", "finance"].includes(role)) {
      await expect(page.locator("body")).not.toContainText(/AP Aging|Cash Flow|aggregate debt|Payment controls/i);
      await page.goto("/supplier-invoices/aging", { waitUntil: "domcontentloaded" });
      await expect(page).not.toHaveURL(/\/supplier-invoices\/aging$/);
    }
    if (role !== "superAdmin") {
      await page.goto("/administration/backups", { waitUntil: "domcontentloaded" });
      await expect(page).not.toHaveURL(/\/administration\/backups$/);
    }
    expect(critical.filter((message) => /hydration|server component|uncaught|typeerror|referenceerror/i.test(message))).toEqual([]);
  });
}
