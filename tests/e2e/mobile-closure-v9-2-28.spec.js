const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

async function expectNoOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(5);
}

async function expectNoFrameworkError(page) {
  await expect(page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")).toHaveCount(0);
  expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(20);
}

test("Outlet Daily phone actions are one equal row and sales use two numeric columns", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "superAdmin");
  await page.goto("/outlet-daily-records", { waitUntil: "domcontentloaded" });
  const recordRow = page.getByRole("listitem", { name: "Open Local E2E Outlet daily record" }).first();
  const recordHref = await recordRow.getAttribute("href");
  expect(recordHref).toMatch(/^\/outlet-daily-records\/[0-9a-f-]+$/);
  await page.goto(recordHref, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/outlet-daily-records\/[0-9a-f-]+$/);
  await expect(page.getByLabel("POS Total Sales (RM)")).toBeVisible({ timeout: 30_000 });

  const actionBar = page.locator("[data-mobile-document-action]");
  await expect(actionBar).toBeVisible();
  const actionBoxes = await actionBar.locator(":scope > div").evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }));
  expect(actionBoxes).toHaveLength(2);
  expect(Math.abs(actionBoxes[0].width - actionBoxes[1].width)).toBeLessThanOrEqual(2);
  expect(Math.abs(actionBoxes[0].y - actionBoxes[1].y)).toBeLessThanOrEqual(1);

  const salesGrid = page.getByLabel("POS Total Sales (RM)").locator("xpath=../..");
  const columns = await salesGrid.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").filter(Boolean));
  expect(columns).toHaveLength(2);
  await expect(page.getByLabel("POS Total Sales (RM)")).toHaveAttribute("inputmode", "decimal");
  await page.getByRole("button", { name: "More", exact: true }).click();
  const moreDialog = page.getByRole("dialog", { name: "More options" });
  await expect(moreDialog).toBeVisible();
  const moreChildren = moreDialog.locator(".grid.gap-2 > *");
  if (await moreChildren.count() > 1) {
    const boxes = await moreChildren.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect()));
    expect(boxes[1].top - boxes[0].bottom).toBeGreaterThanOrEqual(7);
  }
  await expectNoOverflow(page);
  await expectNoFrameworkError(page);
});

test("Outlet Calendar uses one compact month axis and persistent app navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "superAdmin");
  await page.goto("/outlet-calendar", { waitUntil: "domcontentloaded" });
  const calendar = page.locator('section[aria-label="Monthly compliance calendar"]');
  await expect(calendar).toBeVisible({ timeout: 30_000 });
  await expect(calendar.locator("header h2")).toHaveCount(1);
  await expect(calendar.getByRole("button", { name: "Previous month" })).toBeVisible();
  await expect(calendar.getByRole("button", { name: "Next month" })).toBeVisible();
  await expect(calendar.locator('input[type="month"]')).toBeHidden();
  await expect(page.locator("[data-mobile-bottom-nav]")).toBeVisible();
  await expect(page.locator("[data-mobile-action-bar]")).toHaveCount(0);
  await expectNoOverflow(page);
  await expectNoFrameworkError(page);
});

test("Compliance phone upload is a same-row 70/30 control", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "superAdmin");
  await page.goto("/outlet-compliance", { waitUntil: "domcontentloaded" });
  await page.getByRole("listitem", { name: "Open Local E2E Outlet" }).dblclick();
  const missing = page.locator("details").filter({ hasText: "Pest Control" }).first();
  await missing.locator("summary").click();
  const upload = missing.getByRole("button", { name: "Upload", exact: true });
  await expect(upload).toBeVisible();
  const uploadRow = upload.locator("xpath=..");
  const rowBoxes = await uploadRow.locator(":scope > *").evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }));
  expect(rowBoxes).toHaveLength(2);
  expect(Math.abs(rowBoxes[0].y - rowBoxes[1].y)).toBeLessThanOrEqual(25);
  expect(rowBoxes[0].width / rowBoxes[1].width).toBeGreaterThan(1.7);
  await expect(page.locator("[data-mobile-bottom-nav]")).toBeVisible();
  await expectNoOverflow(page);
  await expectNoFrameworkError(page);
});

test("Attendance phone schedule uses the day planner and never replaces app navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "manager");
  await page.goto("/attendance/schedule", { waitUntil: "domcontentloaded" });
  const dayPlanner = page.locator("[data-schedule-mobile-day]");
  await expect(dayPlanner).toBeVisible({ timeout: 30_000 });
  await expect(dayPlanner.locator(":scope > div").first().getByRole("button")).toHaveCount(7);
  await expect(page.locator("table")).toBeHidden();
  await expect(page.locator("[data-mobile-bottom-nav]")).toBeVisible();
  await expect(page.locator("[data-mobile-action-bar]")).toHaveCount(0);
  await expectNoOverflow(page);
  await expectNoFrameworkError(page);
});

test("Dashboard pipeline has no broken sibling divider borders", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "superAdmin");
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  const pipeline = page.locator("[data-dashboard-pipeline]");
  await expect(pipeline).toBeVisible({ timeout: 30_000 });
  const borders = await pipeline.locator(":scope > *").evaluateAll((nodes) => nodes.map((node) => {
    const style = getComputedStyle(node);
    return [style.borderRightWidth, style.borderBottomWidth];
  }));
  expect(borders.every(([right, bottom]) => right === "0px" && bottom === "0px")).toBeTruthy();
  await expectNoOverflow(page);
  await expectNoFrameworkError(page);
});

test("Outlet can resave Ready to post until Purchasing posts and locks it", async ({ browser }) => {
  const outletContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const outletPage = await outletContext.newPage();
  await login(outletPage, "outlet");
  await outletPage.goto("/outlet-daily-records", { waitUntil: "domcontentloaded" });
  const outletRow = outletPage.getByRole("listitem", { name: "Open Local E2E Outlet daily record" }).first();
  const recordHref = await outletRow.getAttribute("href");
  expect(recordHref).toMatch(/^\/outlet-daily-records\/[0-9a-f-]+$/);
  await outletPage.goto(recordHref, { waitUntil: "domcontentloaded" });
  await expect(outletPage.getByRole("button", { name: /Save Changes/i })).toBeVisible({ timeout: 30_000 });
  await expect(outletPage.getByRole("button", { name: /Post Daily Record/i })).toHaveCount(0);

  const purchasingContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const purchasingPage = await purchasingContext.newPage();
  await login(purchasingPage, "purchasing");
  await purchasingPage.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(purchasingPage.getByText("Review outlet quantities and post to lock editing", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await purchasingPage.goto(recordHref, { waitUntil: "domcontentloaded" });
  await purchasingPage.getByRole("button", { name: /Post Daily Record/i }).click();
  await expect(purchasingPage.getByRole("button", { name: /Post Daily Record/i })).toHaveCount(0, { timeout: 30_000 });
  await expect(purchasingPage.getByLabel("POS Total Sales (RM)")).toBeDisabled();

  await outletPage.reload({ waitUntil: "domcontentloaded" });
  await expect(outletPage.getByRole("button", { name: /Save Changes/i })).toHaveCount(0, { timeout: 30_000 });
  await expect(outletPage.getByLabel("POS Total Sales (RM)")).toBeDisabled();
  await outletContext.close();
  await purchasingContext.close();
});
