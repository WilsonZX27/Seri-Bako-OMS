const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

async function expectNoPageOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(5);
}

test.beforeEach(async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Missing super-admin test credentials.");
  await login(page, "superAdmin");
});

test("v8.64.66 dashboard unread badge is red and imports directory is rounded", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  const updates = page.getByRole("button", { name: /open workspace updates/i });
  await expect(updates).toBeVisible({ timeout: 30_000 });
  const badge = updates.locator("span").last();
  if (await badge.count()) {
    expect(await badge.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe("rgb(180, 35, 24)");
  }

  await page.goto("/imports", { waitUntil: "domcontentloaded" });
  const directory = page.locator("main a[href='/imports/autocount']").locator("xpath=ancestor::div[contains(@class,'rounded-')][1]");
  await expect(page.getByText("AutoCount Direct Import", { exact: true })).toBeVisible({ timeout: 30_000 });
  const radius = await directory.evaluate((node) => getComputedStyle(node).borderRadius);
  expect(Number.parseFloat(radius)).toBeGreaterThan(0);
  await expectNoPageOverflow(page);
});

test("v8.64.66 portrait tablet keeps AutoCount actions and status in the right rail", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/imports/autocount", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "AutoCount Direct Import" })).toBeVisible({ timeout: 30_000 });
  const split = page.locator("[data-tablet-document-split]");
  const rail = split.locator(":scope > aside");
  await expect(rail).toBeVisible();
  await expect(rail.getByText("Actions", { exact: true })).toBeVisible();
  await expect(rail.getByText("Import status", { exact: true })).toBeVisible();
  const titles = await rail.locator("[data-console-section] > div:first-child h2").allTextContents();
  expect(titles.indexOf("Actions")).toBeLessThan(titles.indexOf("Import status"));
  expect((await rail.boundingBox()).width).toBeGreaterThanOrEqual(180);
  await expectNoPageOverflow(page);
});

for (const viewport of [
  { width: 390, height: 844, expectedControl: 48 },
  { width: 820, height: 1180, expectedControl: 36 },
  { width: 1180, height: 820, expectedControl: 36 },
  { width: 1440, height: 900, expectedControl: 36 },
]) {
  test(`v8.64.66 PR and PO setup geometry at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });
    const requestDetails = page.locator("[data-purchase-request-setup] [data-document-section-header]");
    const requestedItems = page.locator("[data-purchase-request-workspace] [data-document-section-header]");
    await expect(requestDetails).toBeVisible({ timeout: 30_000 });
    await expect(requestedItems).toBeVisible();
    expect(await requestDetails.evaluate((node) => getComputedStyle(node).backgroundColor))
      .toBe(await requestedItems.evaluate((node) => getComputedStyle(node).backgroundColor));
    const supplier = page.getByLabel("Request supplier");
    await expect(supplier).toBeVisible();
    expect(Math.round((await supplier.boundingBox()).height)).toBe(viewport.expectedControl);

    await page.goto("/purchase-orders/new", { waitUntil: "domcontentloaded" });
    await expect(page.locator("section[data-purchase-order-form-surface]")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /collapse order details|expand order details/i })).toHaveCount(0);
    await expectNoPageOverflow(page);
  });
}

test("v8.64.66 guided PR review uses a large dialog, black backdrop, combined quantity/UOM, and real supplier options", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/purchase-requests/61be95af-707f-40fc-8022-644a8b98fd00", { waitUntil: "domcontentloaded" });
  const review = page.getByRole("button", { name: /^Review / }).first();
  await expect(review).toBeVisible({ timeout: 30_000 });
  await review.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect((await dialog.boundingBox()).width).toBeGreaterThan(900);
  expect(await dialog.evaluate((node) => getComputedStyle(node, "::backdrop").backgroundColor)).toBe("rgba(0, 0, 0, 0.6)");
  await expect(dialog.getByText("Quantity / UOM", { exact: true })).toBeVisible();
  expect(Number(await dialog.getAttribute("data-supplier-option-count"))).toBeGreaterThan(0);
  const supplier = dialog.locator('select[name="supplier_id"]');
  const options = await supplier.locator("option").allTextContents();
  expect(options.filter((value) => value !== "Needs supplier setup").length).toBeGreaterThan(0);
  await expect(dialog.getByRole("link", { name: "Create supplier mapping" })).toBeVisible();
});

test("v8.64.67 portrait PR rail exposes the complete Comments panel", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/purchase-requests/61be95af-707f-40fc-8022-644a8b98fd00", { waitUntil: "domcontentloaded" });
  const commentsHeading = page.getByRole("heading", { name: "Comments", exact: true });
  await expect(commentsHeading).toBeVisible({ timeout: 30_000 });
  const section = commentsHeading.locator("xpath=ancestor::*[@data-console-section][1]");
  await section.locator('textarea[name="comment_text"]').scrollIntoViewIfNeeded();
  await expect(section.locator('textarea[name="comment_text"]')).toBeVisible();
  await section.getByRole("button", { name: "Add comment" }).scrollIntoViewIfNeeded();
  await expect(section.getByRole("button", { name: "Add comment" })).toBeVisible();
  expect(await section.evaluate((node) => getComputedStyle(node).overflowY)).not.toBe("hidden");
  await expectNoPageOverflow(page);
});

test("v8.64.67 portrait PR review dialog stays operable with a black backdrop", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/purchase-requests/61be95af-707f-40fc-8022-644a8b98fd00", { waitUntil: "domcontentloaded" });
  const review = page.getByRole("button", { name: /^Review / }).first();
  await expect(review).toBeVisible({ timeout: 30_000 });
  await review.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box.width).toBeGreaterThan(700);
  expect(box.width).toBeLessThanOrEqual(820);
  expect(box.height).toBeLessThanOrEqual(1180);
  expect(await dialog.evaluate((node) => getComputedStyle(node, "::backdrop").backgroundColor)).toBe("rgba(0, 0, 0, 0.6)");
  await expect(dialog.getByRole("button", { name: /apply and revalidate/i })).toBeVisible();
});
