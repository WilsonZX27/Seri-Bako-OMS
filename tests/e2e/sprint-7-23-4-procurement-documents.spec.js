const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

const evidenceDir = path.join(process.cwd(), "test-results", "sprint-7-23-4");
const viewports = [
  { label: "desktop-1440", width: 1440, height: 900 },
  { label: "tablet-1024", width: 1024, height: 900 },
  { label: "mobile-390", width: 390, height: 844 },
];
const roleRoutes = {
  superAdmin: ["/purchase-requests/new", "/purchase-orders", "/goods-receivings/new", "/supplier-invoices/new"],
  finance: ["/purchase-requests", "/supplier-invoices"],
  manager: ["/purchase-requests"],
  purchasing: ["/purchase-orders", "/goods-receivings/new", "/supplier-invoices/new"],
  kitchen: ["/purchase-requests/new"],
};
const detailProbe = {
  superAdmin: { list: "/purchase-orders", prefix: "/purchase-orders/" },
  finance: { list: "/supplier-invoices", prefix: "/supplier-invoices/" },
  manager: { list: "/purchase-requests", prefix: "/purchase-requests/" },
  purchasing: { list: "/goods-receivings", prefix: "/goods-receivings/" },
  kitchen: { list: "/purchase-requests", prefix: "/purchase-requests/" },
};

function slug(value) {
  return value.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-") || "root";
}

async function assertStableReadOnlyPage(page) {
  await expect(page.locator("body")).not.toContainText(/Application error|Unhandled Runtime Error|Internal Server Error/i);
  await expect(page.locator("body")).toContainText("v7.23.5.6");
  const overflow = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  expect(overflow.content, `page width ${overflow.content} exceeds viewport ${overflow.viewport}`).toBeLessThanOrEqual(overflow.viewport + 5);
}

test.beforeAll(() => fs.mkdirSync(evidenceDir, { recursive: true }));

for (const viewport of viewports) {
  for (const [role, routes] of Object.entries(roleRoutes)) {
    test(`${role} procurement surfaces remain stable at ${viewport.label}`, async ({ browser }) => {
      test.setTimeout(120_000);
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const critical = [];
      page.on("console", (message) => {
        if (message.type() === "error" && /hydration|uncaught|server component|application error/i.test(message.text())) critical.push(message.text());
      });
      page.on("pageerror", (error) => critical.push(error.message));

      await login(page, role);
      for (const route of routes) {
        await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await assertStableReadOnlyPage(page);
        if (viewport.width === 390 && route.endsWith("/new") && new URL(page.url()).pathname === route) {
          await expect(page.locator("[data-inline-form-actions]")).toBeVisible();
          await expect(page.locator("[data-mobile-action-bar]")).toHaveCount(0);
        }
        await page.screenshot({ path: path.join(evidenceDir, `${viewport.label}-${role}-${slug(route)}.png`), fullPage: true });
      }

      const probe = detailProbe[role];
      await page.goto(probe.list, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const detailHref = await page.locator(`a[href^="${probe.prefix}"]`).evaluateAll((links, prefix) => links.map((link) => link.getAttribute("href")).find((href) => href && href !== `${prefix}new`) ?? null, probe.prefix);
      if (detailHref) {
        await page.goto(detailHref, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await assertStableReadOnlyPage(page);
        await page.screenshot({ path: path.join(evidenceDir, `${viewport.label}-${role}-document-detail.png`), fullPage: true });
      }

      if (role === "kitchen") {
        await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });
        await expect(page.getByText("Purchasing details")).toHaveCount(0);
        await expect(page.getByLabel("Estimated unit cost")).toHaveCount(0);
        await expect(page.getByText("Create new item")).toHaveCount(0);
        await page.goto("/supplier-invoices/new", { waitUntil: "domcontentloaded" });
        expect(new URL(page.url()).pathname).not.toBe("/supplier-invoices/new");
      }
      if (role === "purchasing") {
        await page.goto("/supplier-invoices/aging", { waitUntil: "domcontentloaded" });
        expect(new URL(page.url()).pathname).not.toBe("/supplier-invoices/aging");
      }
      if (role === "manager") {
        await page.goto("/supplier-invoices/new", { waitUntil: "domcontentloaded" });
        expect(new URL(page.url()).pathname).not.toBe("/supplier-invoices/new");
      }

      expect(critical).toEqual([]);
      await page.close();
    });
  }
}
