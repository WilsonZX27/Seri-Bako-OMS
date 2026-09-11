const fs = require("node:fs");
const { createClient } = require("@supabase/supabase-js");
const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");
const GUIDED_REVIEW_PR_ID = "e2000000-0000-4000-8000-000000000001";

function loadEnv() {
  if (!fs.existsSync(".env.test.local")) return;
  for (const line of fs.readFileSync(".env.test.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

async function must(promise, label) {
  const result = await promise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

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
    const orderDisclosure = page.getByRole("button", { name: /collapse order details|expand order details/i });
    await expect(orderDisclosure).toBeVisible();
    await orderDisclosure.click();
    await expect(orderDisclosure).toHaveAccessibleName(/expand order details/i);
    await expectNoPageOverflow(page);
  });
}

test("v8.64.66 guided PR review uses a large dialog, black backdrop, combined quantity/UOM, and real supplier options", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/purchase-requests/${GUIDED_REVIEW_PR_ID}`, { waitUntil: "domcontentloaded" });
  const review = page.getByRole("button", { name: /^Edit / }).first();
  await expect(review, "Run setup-local-dashboard-e2e.mjs --annotation-fixture before this suite.").toBeVisible({ timeout: 30_000 });
  await review.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox.width).toBeGreaterThan(600);
  expect(dialogBox.width).toBeLessThanOrEqual(700);
  expect(await dialog.evaluate((node) => getComputedStyle(node, "::backdrop").backgroundColor)).toBe("rgba(0, 0, 0, 0.6)");
  await expect(dialog.getByText("Purchase quantity / UOM", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Replace", exact: true }).click();
  expect(Number(await dialog.getAttribute("data-supplier-option-count"))).toBeGreaterThan(0);
  expect(Number(await dialog.getAttribute("data-supplier-catalogue-count"))).toBeGreaterThan(0);
  const replacement = dialog.getByRole("combobox", { name: "Replacement Item" });
  await expect(replacement).toHaveAttribute("data-hydrated", "true");
  await replacement.fill("E2E-SOURCE-A-ITEM");
  await expect(page.getByRole("option").filter({ hasText: "Alpha Mapped Ingredient" })).toBeVisible();
});

test("v8.64.67 portrait PR rail exposes the complete Comments panel", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto(`/purchase-requests/${GUIDED_REVIEW_PR_ID}`, { waitUntil: "domcontentloaded" });
  const commentsHeading = page.getByRole("heading", { name: "Comments", exact: true });
  await expect(commentsHeading, "Run setup-local-dashboard-e2e.mjs --annotation-fixture before this suite.").toBeVisible({ timeout: 30_000 });
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
  await page.goto(`/purchase-requests/${GUIDED_REVIEW_PR_ID}`, { waitUntil: "domcontentloaded" });
  const review = page.getByRole("button", { name: /^Edit / }).first();
  await expect(review, "Run setup-local-dashboard-e2e.mjs --annotation-fixture before this suite.").toBeVisible({ timeout: 30_000 });
  await review.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box.width).toBeGreaterThan(600);
  expect(box.width).toBeLessThanOrEqual(820);
  expect(box.height).toBeLessThanOrEqual(1180);
  expect(await dialog.evaluate((node) => getComputedStyle(node, "::backdrop").backgroundColor)).toBe("rgba(0, 0, 0, 0.6)");
  await expect(dialog.getByRole("button", { name: /apply and revalidate/i })).toBeVisible();
});

test("guided PR review applies a replacement and records the local mutation", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Missing super-admin test credentials.");
  test.skip(process.env.RUN_TENANT_BOUNDARY_E2E !== "1", "Guided review mutation is local-only.");
  loadEnv();
  const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  test.skip(!localUrl || !["127.0.0.1", "localhost"].includes(new URL(localUrl).hostname), "Guided review mutation is restricted to local Supabase.");
  const admin = createClient(localUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/purchase-requests/${GUIDED_REVIEW_PR_ID}`, { waitUntil: "domcontentloaded" });
  const review = page.getByRole("button", { name: /^Edit / }).first();
  await expect(review).toBeVisible({ timeout: 30_000 });
  await review.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Replace", exact: true }).click();
  const replacement = dialog.getByRole("combobox", { name: "Replacement Item" });
  await expect(replacement).toBeEnabled();
  await expect(replacement).toHaveAttribute("data-hydrated", "true");
  await replacement.fill("E2E-SOURCE-A-ITEM");
  await expect(page.getByRole("option").filter({ hasText: "Alpha Mapped Ingredient" })).toBeVisible();
  await dialog.getByRole("combobox", { name: "Replacement Item" }).press("Enter");
  await dialog.locator('input[name="qty"]').fill("3");
  await expect(dialog.locator('input[name="supplier_id"]')).not.toHaveValue("");
  await dialog.locator('textarea[name="reason"]').fill("Confirm mapped supplier and controlled purchase UOM during local review.");
  await dialog.getByRole("button", { name: /apply and revalidate/i }).click();

  await expect(page).toHaveURL(new RegExp(`/purchase-requests/${GUIDED_REVIEW_PR_ID}(?:\\?.*)?$`), { timeout: 30_000 });
  await expect(page.locator("body")).toContainText(/Request line updated and supplier readiness recalculated/i);

  const line = await must(admin.from("purchase_request_lines").select("item_id,qty,uom,suggested_supplier_id").eq("id", "e2000000-0000-4000-8000-000000000003").single(), "guided review line");
  const mappedItem = await must(admin.from("items").select("id").eq("item_code", "E2E-SOURCE-A-ITEM").single(), "mapped item");
  const mappedSupplier = await must(admin.from("suppliers").select("id").eq("supplier_code", "E2E-SOURCE-A").single(), "mapped supplier");
  expect(line.item_id).toBe(mappedItem.id);
  expect(Number(line.qty)).toBe(3);
  expect(line.uom).toBe("CTN");
  expect(line.suggested_supplier_id).toBe(mappedSupplier.id);

  const revisions = await must(admin.from("document_line_revisions").select("action,reason").eq("line_id", "e2000000-0000-4000-8000-000000000003").order("created_at", { ascending: false }).limit(1), "guided review revision");
  expect(revisions[0]?.action).toBe("replace");
  expect(revisions[0]?.reason).toMatch(/controlled purchase UOM/i);
});
