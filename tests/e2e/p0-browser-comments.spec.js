const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

async function expectContained(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(5);
}

test("shared tablet list filters match the accepted stock-count grammar", async ({ page }, testInfo) => {
  test.skip(!hasAccount("purchasing"), "Missing purchasing test credentials.");
  await page.setViewportSize({ width: 820, height: 1180 });
  await login(page, "purchasing");

  for (const route of ["/items", "/purchase-requests", "/goods-receivings", "/stock-counts"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const form = page.locator("form.sb-list-query-card").first();
    const query = form.locator('input[type="search"], input[name="search"], input[placeholder*="Search"]').first();
    await expect(form).toBeVisible();
    await expect(query).toBeVisible();
    const [formBox, queryBox] = await Promise.all([form.boundingBox(), query.boundingBox()]);
    expect(queryBox.width / formBox.width).toBeGreaterThan(0.9);
    await expectContained(page);
  }
  await page.screenshot({ path: testInfo.outputPath("tablet-filter-standard.png"), fullPage: true });
});

test("purchasing cannot perform the manager review stage", async ({ page }, testInfo) => {
  test.skip(!hasAccount("purchasing") || !hasAccount("manager"), "Missing purchasing or manager test credentials.");
  await login(page, "manager");
  await page.goto("/purchase-requests?status=manager_review", { waitUntil: "domcontentloaded" });
  const record = page.locator('a[href^="/purchase-requests/"]:not([href="/purchase-requests/new"]):visible').first();
  await expect(record).toBeVisible();
  const href = await record.getAttribute("href");
  await page.context().clearCookies();
  await page.setViewportSize({ width: 430, height: 932 });
  await login(page, "purchasing");
  await page.goto(href, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /Approve as Manager/i })).toHaveCount(0);
  await expectContained(page);
  await page.screenshot({ path: testInfo.outputPath("purchase-request-mobile-role-safe.png"), fullPage: true });
});

test("procurement create surfaces expose complete UOM and one workflow grammar", async ({ page }, testInfo) => {
  test.skip(!hasAccount("purchasing"), "Missing purchasing test credentials.");
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "purchasing");

  await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });
  const uom = page.locator('select[aria-label^="Unit of measure for"]').first();
  await expect(uom).toBeVisible();
  const units = await uom.locator("option").allTextContents();
  for (const unit of ["KG", "ML", "PKT", "CASE", "DOZEN", "ROLL", "CAN"]) expect(units).toContain(unit);

  await page.goto("/purchase-orders/new", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-document-workspace-header]")).toContainText(/Draft/);
  await expect(page.getByText("Order details", { exact: true })).toBeVisible();
  await expect(page.getByText("Ordered Items", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Receiving is intentionally not part of Sprint");
  await page.screenshot({ path: testInfo.outputPath("purchase-order-unified.png"), fullPage: true });

  await page.goto("/goods-receivings/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /receiving setup/i })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/^Hide$/);
});

test("dashboard removes duplicate rails and alerts", async ({ page }, testInfo) => {
  test.skip(!hasAccount("finance"), "Missing finance test credentials.");
  await page.setViewportSize({ width: 1180, height: 820 });
  await login(page, "finance");
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Workspace Context", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Alerts", { exact: true })).toHaveCount(0);
  await expect(page.locator("[data-dashboard-actions]")).toHaveCount(0);
  await expect(page.getByText(/Actions awaiting you|Purchase request progress/)).toBeVisible();
  await expectContained(page);
  await page.screenshot({ path: testInfo.outputPath("dashboard-no-duplicates.png"), fullPage: true });
});

test("aging, outlet insight, and wide production canvas use the requested density", async ({ page }, testInfo) => {
  test.skip(!hasAccount("finance") || !hasAccount("purchasing"), "Missing finance or purchasing test credentials.");
  await page.setViewportSize({ width: 820, height: 1180 });
  await login(page, "finance");
  await page.goto("/supplier-invoices/aging", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h2:visible").filter({ hasText: "Payables Snapshot" }).first()).toBeVisible();
  const insightPanels = page.locator("main#main-content div.grid.items-start.gap-3.md\\:grid-cols-2 > section");
  if (await insightPanels.count() >= 2) {
    const [first, second] = await Promise.all([insightPanels.nth(0).boundingBox(), insightPanels.nth(1).boundingBox()]);
    expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(4);
    expect(second.x).toBeGreaterThan(first.x);
  }
  await page.screenshot({ path: testInfo.outputPath("ap-aging-tablet.png"), fullPage: true });

  await page.context().clearCookies();
  await page.setViewportSize({ width: 2560, height: 1200 });
  await login(page, "purchasing");
  await page.goto("/production/jobs", { waitUntil: "domcontentloaded" });
  const canvas = page.locator('[data-tablet-canvas="full"]').first();
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox.width).toBeGreaterThan(1800);
  await expectContained(page);
  await page.screenshot({ path: testInfo.outputPath("production-jobs-wide.png"), fullPage: true });

  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/outlet-daily-records", { waitUntil: "domcontentloaded" });
  const stickyOutlet = page.locator("[data-outlet-completion-matrix] tbody th").first();
  if (await stickyOutlet.count()) {
    expect(await stickyOutlet.evaluate((node) => getComputedStyle(node).boxShadow)).toBe("none");
  }
  await expectContained(page);
  await page.screenshot({ path: testInfo.outputPath("outlet-daily-mobile.png"), fullPage: true });
});

test("low-stock rows expose an auditable next decision", async ({ page }, testInfo) => {
  test.skip(!hasAccount("purchasing"), "Missing purchasing test credentials.");
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "purchasing");
  await page.goto("/low-stock", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-low-stock-decision-summary]:visible").first()).toBeVisible();
  const decisions = page.locator("[data-low-stock-decision]:visible");
  if (await decisions.count()) {
    await expect(decisions.first()).toHaveAttribute("aria-label", /Buy now|Fix supplier first|Monitor/);
  }
  await expectContained(page);
  await page.screenshot({ path: testInfo.outputPath("low-stock-decision-summary.png"), fullPage: true });
});
