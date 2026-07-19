const { test, expect } = require("@playwright/test");
const { hasAccount, login, missingAccountVars } = require("./helpers");

const widths = [1440, 1024, 768, 430, 390, 360];
const routes = [
  "/purchase-requests", "/purchase-orders", "/goods-receivings", "/supplier-invoices", "/purchase-returns",
  "/items", "/products", "/suppliers", "/supplier-items", "/stock-balance", "/stock-transactions",
  "/stock-transfers", "/stock-counts", "/stock-wastage", "/production/jobs", "/outlet-daily-records", "/recipes",
];
const access = [
  ["superAdmin", "/products", "Products"],
  ["finance", "/recipes", "Recipe / BOM"],
  ["manager", "/purchase-requests", "Purchase Requests", "/supplier-invoices"],
  ["purchasing", "/suppliers", "Suppliers", "/recipes"],
  ["kitchen", "/production/jobs", "Production Jobs", "/supplier-invoices"],
  ["outlet", "/outlet-daily-records", "Outlet Daily Records", "/purchase-orders"],
];

for (const [role, allowedRoute, heading, deniedRoute] of access) {
  test(`${role} receives stable allowed and denied list access`, async ({ page }) => {
    test.skip(!hasAccount(role), `Missing ${role} credentials: ${missingAccountVars(role).join(", ")}`);
    await login(page, role);
    await page.goto(allowedRoute, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i);
    if (deniedRoute) {
      await page.goto(deniedRoute, { waitUntil: "domcontentloaded" });
      expect(new URL(page.url()).pathname).not.toBe(deniedRoute);
      await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i);
    }
  });
}

test("Goods Receiving hydrates cleanly at tablet width", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing Owner credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 768, height: 850 });
  await login(page, "superAdmin");
  errors.length = 0;
  await page.goto("/goods-receivings", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Goods Receiving", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const width of widths) {
  test(`operational lists preserve the ${width}px data workspace`, async ({ page }) => {
    test.setTimeout(180_000);
    test.skip(!hasAccount("superAdmin"), `Missing Owner credentials: ${missingAccountVars("superAdmin").join(", ")}`);
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        const source = message.location().url;
        errors.push(source ? `${message.text()} @ ${source}` : message.text());
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 850 });
    await login(page, "superAdmin");

    for (const route of routes) {
      await test.step(`${route} at ${width}px`, async () => {
        errors.length = 0;
        await page.goto(route, { waitUntil: "load" });
        await expect(page.locator("h1").first()).toBeVisible();
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error|Page actions/i);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

        const bar = page.locator(".sb-list-filters").first();
        await expect(bar).toBeVisible();
        const filterOverflow = await bar.evaluate((node) => ({ client: node.clientHeight, scroll: node.scrollHeight, overflow: getComputedStyle(node).overflowY }));
        expect(["auto", "scroll"]).not.toContain(filterOverflow.overflow);
        expect(filterOverflow.scroll).toBeLessThanOrEqual(filterOverflow.client + 1);

        const table = page.locator(".sb-table-region").first();
        const list = page.locator('div[role="list"].divide-y').first();
        if (width >= 768) {
          await expect(table).toBeVisible();
          await expect(list).toBeHidden();
        } else {
          await expect(table).toBeHidden();
          await expect(list).toBeVisible();
        }

        const select = bar.locator('[data-select-control]').first();
        if (await select.count()) {
          await select.click();
          const listbox = page.getByRole("listbox");
          await expect(listbox).toBeVisible();
          const bounds = await listbox.boundingBox();
          expect(bounds.x).toBeGreaterThanOrEqual(0);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
          await page.keyboard.press("Escape");
        }

        const more = bar.locator("summary").filter({ hasText: "More filters" }).first();
        if (await more.count()) {
          await more.click();
          const panel = bar.locator(".sb-filter-more-panel");
          await expect(panel).toBeVisible();
          const bounds = await panel.boundingBox();
          expect(bounds.x).toBeGreaterThanOrEqual(0);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
          await page.keyboard.press("Escape");
          await expect(more).toBeFocused();
        }
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        expect(errors, `${route} at ${width}px console`).toEqual([]);
      });
    }
  });
}
