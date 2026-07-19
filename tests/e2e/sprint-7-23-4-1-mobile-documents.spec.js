const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

const evidenceDir = path.join(process.cwd(), "test-results", "sprint-7-23-4-1");

async function firstDetailHref(page, listRoute, prefix) {
  await page.goto(listRoute, { waitUntil: "domcontentloaded" });
  return page.locator(`a[href^="${prefix}"]`).evaluateAll((links, routePrefix) => links.map((link) => link.getAttribute("href")).find((href) => href && href !== `${routePrefix}new`) ?? null, prefix);
}

async function actionablePrHref(page) {
  for (const status of ["manager_review", "admin_review", "finance_review", "ready_to_convert", "draft"]) {
    const href = await firstDetailHref(page, `/purchase-requests?status=${status}`, "/purchase-requests/");
    if (href) return href;
  }
  return firstDetailHref(page, "/purchase-requests", "/purchase-requests/");
}

async function assertNoPageOverflow(page) {
  const geometry = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
}

test.beforeAll(() => fs.mkdirSync(evidenceDir, { recursive: true }));

for (const width of [360, 390, 430]) {
  test(`PR document is compact and overflow-free at ${width}px`, async ({ browser }) => {
    test.setTimeout(120_000);
    const page = await browser.newPage({ viewport: { width, height: 740 } });
    await login(page, "superAdmin");
    const href = await actionablePrHref(page);
    test.skip(!href, "No seeded Purchase Request is available.");
    await page.goto(href, { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Page actions", { exact: true })).toHaveCount(0);
    await expect(page.locator("[data-mobile-workflow-summary]")).toBeVisible();
    const primaryAction = page.locator("[data-mobile-document-action]");
    if (await primaryAction.count()) await expect(primaryAction).not.toContainText("Page actions");
    const visibleDeleteCount = await page.getByText("Delete purchase request", { exact: true }).evaluateAll((elements) => elements.filter((element) => element.getClientRects().length > 0).length);
    expect(visibleDeleteCount).toBe(0);
    await assertNoPageOverflow(page);

    if (width === 360) {
      await page.screenshot({ path: path.join(evidenceDir, "01-pr-mobile-closed-360.png"), fullPage: true });
      await page.getByRole("button", { name: "View workflow" }).click();
      await expect(page.getByRole("dialog", { name: "Workflow progress" })).toBeVisible();
      if (await primaryAction.count()) await expect(primaryAction).toBeHidden();
      await page.screenshot({ path: path.join(evidenceDir, "02-pr-mobile-workflow-360.png"), fullPage: true });
      await page.getByRole("dialog", { name: "Workflow progress" }).getByRole("button", { name: "Close Workflow progress" }).click();
      const moreOptions = page.getByRole("button", { name: /More options/i });
      if (await moreOptions.count()) {
        await moreOptions.click();
        const dialog = page.getByRole("dialog", { name: "More options" });
        await expect(dialog).toBeVisible();
        const backdrop = dialog.locator("xpath=preceding-sibling::button");
        await expect(backdrop).toHaveCSS("backdrop-filter", /blur/);
        await page.screenshot({ path: path.join(evidenceDir, "03-pr-mobile-action-sheet-360.png"), fullPage: true });
      }
    }
    await page.close();
  });
}

test("Finance has no Manager Review action or sticky footer", async ({ browser }) => {
  test.setTimeout(120_000);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await login(page, "finance");
  const href = await firstDetailHref(page, "/purchase-requests?status=manager_review", "/purchase-requests/");
  expect(href, "A Finance-visible PR currently in Manager Review is required for this acceptance gate.").toBeTruthy();
  await page.goto(href, { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-mobile-workflow-summary]")).toContainText("Manager Review");
  await expect(page.getByRole("button", { name: /Manager Approve|Review PR/i })).toHaveCount(0);
  await expect(page.locator("[data-mobile-document-action]")).toHaveCount(0);
  await expect(page.getByText("Page actions", { exact: true })).toHaveCount(0);
  await assertNoPageOverflow(page);
  await page.screenshot({ path: path.join(evidenceDir, "04-finance-no-manager-action-390.png"), fullPage: true });
  await page.close();
});

test("Manager list, dashboard queue, and visible PR notifications stay in branch scope", async ({ browser }) => {
  test.setTimeout(120_000);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await login(page, "manager");
  await page.goto("/purchase-requests?status=manager_review", { waitUntil: "domcontentloaded" });
  const listIds = new Set(await page.locator('a[href^="/purchase-requests/"]').evaluateAll((links) => links.map((link) => link.getAttribute("href"))));
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Manager Workdesk" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actions awaiting you" })).toBeVisible();
  await expect(page.locator(".animate-pulse")).toHaveCount(0);
  const queueIds = await page.locator('a[href^="/purchase-requests/"]').evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute("href")))]);
  for (const href of queueIds) expect(listIds.has(href), `${href} is in the Manager queue but not the scoped Manager Review list`).toBe(true);
  const updates = page.getByRole("button", { name: /open workspace updates/i });
  if (await updates.count()) {
    await updates.click();
    const notificationIds = await page.locator('[data-topbar-activity-menu] a[href^="/purchase-requests/"]').evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute("href")))]).catch(() => []);
    for (const href of notificationIds) {
      await page.goto(href, { waitUntil: "domcontentloaded" });
      await expect(page.locator("header").first()).toContainText(/Manager Review/i);
    }
  }
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Manager Workdesk" })).toBeVisible();
  await expect(page.locator(".animate-pulse")).toHaveCount(0);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(evidenceDir, "05-manager-dashboard-queue-1440.png"), fullPage: true });
  await page.close();
});

for (const width of [390, 768]) {
  test(`More filters opens without clipping at ${width}px`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await login(page, "superAdmin");
    await page.goto("/stock-transactions?source=E2E", { waitUntil: "domcontentloaded" });
    const more = page.getByText(/More filters/i).first();
    await expect(more).toContainText("1");
    await more.click();
    const panel = page.locator(".sb-filter-more[open] > .sb-filter-more-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Filters" })).toBeVisible();
    await expect(panel.getByText("Changes take effect after you select Apply.")).toBeVisible();
    await expect(panel.getByRole("link", { name: "Reset" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Apply" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Close filters" })).toBeVisible();
    const box = await panel.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: path.join(evidenceDir, `06-more-filters-${width}.png`), fullPage: true });
    await page.close();
  });
}

test("PO keeps a horizontal tablet workdesk and inspector", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  await login(page, "superAdmin");
  const href = await firstDetailHref(page, "/purchase-orders", "/purchase-orders/");
  test.skip(!href, "No seeded purchase order is available.");
  await page.goto(href, { waitUntil: "domcontentloaded" });
  const inspector = page.locator("[data-tablet-document-inspector]");
  await expect(inspector).toBeVisible();
  const inspectorBox = await inspector.boundingBox();
  expect(inspectorBox.width).toBeGreaterThan(200);
  await assertNoPageOverflow(page);
  await page.screenshot({ path: path.join(evidenceDir, "07-po-tablet-split-1024.png"), fullPage: true });
  await page.close();
});
