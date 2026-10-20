const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const evidence = path.join(process.cwd(), "test-results", "sprint-7-23-3");
const viewports = [
  { width: 1440, height: 900, label: "desktop" },
  { width: 1024, height: 900, label: "tablet" },
  { width: 390, height: 844, label: "mobile" },
];
const roleRoutes = {
  superAdmin: "/purchase-requests",
  finance: "/supplier-invoices",
  manager: "/purchase-requests",
  purchasing: "/purchase-orders",
  chef: "/production/jobs",
  kitchen: "/asset-management?view=checklist",
  outlet: "/outlet-daily-records",
};
const migratedRoutes = [
  "/purchase-requests", "/purchase-orders", "/goods-receivings", "/supplier-invoices",
  "/stock-balance", "/stock-transactions", "/items", "/production/jobs", "/outlet-daily-records",
];
const routeSelection = new Set(String(process.env.AUDIT_ROUTES || "").split(",").map((route) => route.trim()).filter(Boolean));
const auditedRoutes = routeSelection.size ? migratedRoutes.filter((route) => routeSelection.has(route)) : migratedRoutes;

async function assertGeometry(page, viewport) {
  const geometry = await page.evaluate(() => ({
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    tableVisible: [...document.querySelectorAll(".sb-table-region")].some((node) => getComputedStyle(node).display !== "none"),
    listVisible: [...document.querySelectorAll('[role="list"]')].some((node) => getComputedStyle(node).display !== "none"),
  }));
  expect(geometry.pageOverflow).toBeLessThanOrEqual(5);
  // Pages choose a table or touch-first list according to their information
  // density; the shared invariant is that one usable data surface is visible.
  expect(geometry.tableVisible || geometry.listVisible).toBe(true);
  if (viewport.width === 1024) await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeVisible();
}

test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));

for (const [role, route] of Object.entries(roleRoutes)) {
  test(`${role} sees a stable responsive operational list`, async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!hasAccount(role), `Missing local-only credentials for ${role}.`);
    const critical = [];
    page.on("console", (message) => { if (message.type() === "error") critical.push(message.text()); });
    page.on("pageerror", (error) => critical.push(error.message));
    await login(page, role);

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}(?:\\?.*)?$`));
      await assertGeometry(page, viewport);
      await page.addStyleTag({ content: 'tbody td:not(:last-child), [role="listitem"] > div { filter: blur(3px); }' });
      await page.screenshot({ path: path.join(evidence, `${role}-${viewport.label}.png`), fullPage: true, caret: "initial" });
    }
    expect(critical.filter((message) => /hydration|server component|uncaught|typeerror|referenceerror/i.test(message))).toEqual([]);
  });
}

test("migrated routes expose a usable data surface without overflow", async ({ page }) => {
  test.setTimeout(180_000);
  test.skip(!hasAccount("superAdmin"), "Missing local-only Owner credentials.");
  await login(page, "superAdmin");
  for (const route of auditedRoutes) {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await assertGeometry(page, viewport);
      if (route === "/stock-card") {
        await expect(page.getByText(/stock card data is temporarily unavailable/i)).toHaveCount(0);
      }
    }
  }
});
