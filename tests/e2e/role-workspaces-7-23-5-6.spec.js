const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const roles = {
  superAdmin: "Super Admin / Owner",
  peopleOperations: "People Operations",
  finance: "Finance",
  manager: "Manager",
  purchasing: "Purchasing",
  chef: "Chef",
  kitchen: "Kitchen",
  outlet: "Outlet Staff",
};
// Keep this matrix aligned with the release gate. The two tablet orientations
// are intentional: filter wrapping and the fixed bottom navigation behave
// differently when height becomes the constrained axis.
const viewports = [
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 1180, height: 820 },
  { width: 1440, height: 900 },
];
const evidence = path.join(process.cwd(), "test-results", "sprint-7-23-5-7");

test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));

for (const [role, roleLabel] of Object.entries(roles)) {
  test(`${role} has one scoped responsive workdesk and safe destinations`, async ({ page }) => {
    test.setTimeout(240_000);
    test.skip(!hasAccount(role), `Missing local-only credentials for ${role}.`);
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()); });
    await login(page, role);

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await expect(page.locator("[data-dashboard-layout]")).toBeVisible();
      await expect(page.locator("[data-dashboard-user-name]:visible")).not.toBeEmpty();
      await expect(page.locator("[data-dashboard-role-label]:visible")).toHaveText(roleLabel);
      await expect(page.locator("[data-dashboard-scope-label]:visible")).not.toBeEmpty();
      await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error|Page actions/i);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(5);
      if (viewport.width >= 1280) await expect(page.locator("[data-right-console]")).toBeVisible();
      await page.screenshot({
        path: path.join(evidence, `${role}-${viewport.width}x${viewport.height}.png`),
        fullPage: true,
        mask: [page.locator("main strong"), page.locator("main .divide-y"), page.locator("main tbody")],
      });
    }

    if (role === "kitchen") {
      await expect(page.getByRole("button", { name: /open workspace updates/i })).toHaveCount(0);
    } else {
      await page.getByRole("button", { name: /open workspace updates/i }).click();
      await expect(page.getByText("Workspace Updates", { exact: true })).toBeVisible();
      await expect(page.locator('[data-topbar-activity-menu] a[href="/activity"]')).toBeVisible();
      const notificationHrefs = await page.locator("[data-topbar-activity-menu] section").nth(1).locator("a").evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute("href")).filter(Boolean))]);
      expect(notificationHrefs).not.toContain("#");
      for (const href of notificationHrefs.slice(0, 5)) {
        await page.goto(href, { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(new RegExp(`${href.split("?")[0]}(?:\\?|$)`));
      }
    }

    await page.goto("/activity", { waitUntil: "domcontentloaded" });
    if (role === "kitchen") await expect(page).not.toHaveURL(/\/activity/);
    else await expect(page).toHaveURL(/\/activity/);
    await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i);

    if (!["peopleOperations", "outlet", "kitchen"].includes(role)) {
      for (const route of ["/procurement", "/inventory"]) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(new RegExp(`${route}$`));
        await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i);
      }
    }

    const denied = role === "superAdmin" ? []
      : role === "peopleOperations" ? ["/procurement", "/inventory", "/supplier-invoices", "/administration/backups"]
      : role === "finance" ? ["/purchase-requests?status=manager_review", "/administration/backups"]
      : role === "manager" ? ["/supplier-invoices", "/reports/recipe-costing", "/administration/backups"]
      : role === "kitchen" ? ["/procurement", "/inventory", "/activity", "/supplier-invoices", "/reports/recipe-costing", "/purchase-requests", "/items", "/stock-balance", "/production/jobs", "/administration/backups"]
      : ["/supplier-invoices", "/reports/recipe-costing", "/administration/backups"];
    for (const route of denied) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      if (role === "finance" && route.startsWith("/purchase-requests")) {
        await expect(page.getByText("Approve as Manager", { exact: true })).toHaveCount(0);
      } else {
        await expect(page).not.toHaveURL(new RegExp(`${route.split("?")[0]}$`));
      }
    }

    expect(runtimeErrors.filter((message) => /hydration|uncaught|typeerror|referenceerror|permission denied/i.test(message))).toEqual([]);
  });
}
