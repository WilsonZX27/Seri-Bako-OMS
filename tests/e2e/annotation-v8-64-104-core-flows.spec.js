const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const REJECTED_PR_ID = "e2000000-0000-4000-8000-000000000007";

async function expectNoPageOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(5);
}

async function selectBranchWithSupplier(page, supplierName) {
  const branch = page.locator('select[name="branch_id"]');
  const supplier = page.getByLabel("Request supplier");
  for (const value of await branch.locator("option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean))) {
    await branch.selectOption(value);
    if (await supplier.locator("option", { hasText: supplierName }).count()) return;
  }
  throw new Error(`No branch exposes ${supplierName}; run the annotation fixture first.`);
}

test.beforeEach(async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Missing super-admin test credentials.");
  await login(page, "superAdmin");
});

test("supplier item combobox supports keyboard selection and keeps Base UOM in Item Master", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/supplier-items/new", { waitUntil: "domcontentloaded" });
  const item = page.getByRole("combobox", { name: "Search Item Master by name, code, or brand" });
  await expect(item).toBeVisible({ timeout: 30_000 });
  await item.fill("E2E-NAT-1");
  const option = page.getByRole("option", { name: /^Natural Sort 1 E2E-NAT-1\b/ });
  await expect(option).toContainText("E2E-NAT-1");
  await expect(option).toContainText("Purchase PACK · Base PACK");
  await expect(item).toHaveAttribute("aria-activedescendant", /option-0$/);
  await item.press("ArrowDown");
  await expect(item).toHaveAttribute("aria-activedescendant", /option-1$/);
  await item.press("ArrowUp");
  await expect(item).toHaveAttribute("aria-activedescendant", /option-0$/);
  await item.press("Enter");
  await expect(item).toHaveValue(/E2E-NAT-1 - Natural Sort 1/);
  const baseUom = page.getByText("Base UOM", { exact: true }).locator("..");
  await expect(baseUom).toContainText("PACK");
  await expect(baseUom.getByRole("link", { name: "Open Item Master" })).toHaveAttribute("href", /\/items\/[0-9a-f-]+$/);
  await expectNoPageOverflow(page);
});

test("supplier identity keeps short name editable without changing AutoCount identity", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/suppliers?search=E2E-SOURCE-A", { waitUntil: "domcontentloaded" });
  const supplierRow = page.locator('table[aria-label="Suppliers"] tbody tr').filter({ hasText: "Local E2E Source Alpha" });
  await expect(supplierRow).toContainText("E2E Alpha");
  await expect(supplierRow).toContainText("AutoCount E2E-SOURCE-A");
  await supplierRow.getByRole("link", { name: "Open Local E2E Source Alpha" }).click();
  await expect(page.getByLabel("Supplier Code")).toHaveValue("E2E-SOURCE-A");
  await expect(page.getByLabel("Supplier Name")).toHaveValue("Local E2E Source Alpha");
  await expect(page.getByLabel("Item Group / Short Name")).toHaveValue("E2E Alpha");
  await expect(page.getByText(/AutoCount supplier code and official Supplier Name remain unchanged/)).toBeVisible();
  await expectNoPageOverflow(page);
});

test("Item detail action hierarchy remains compact across all required viewports", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/items?search=E2E-NAT-1", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Open Natural Sort 1", exact: true }).click();
  for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1180, height: 820 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    if (viewport.width < 768) await page.getByRole("button", { name: "More actions" }).click();
    for (const title of ["Primary Action", "Sourcing readiness", "More Options", "Metadata"]) {
      await expect(page.locator("h2:visible").filter({ hasText: title })).toHaveCount(1);
    }
    await expectNoPageOverflow(page);
    if (viewport.width < 768) await page.getByRole("button", { name: "Close more actions" }).last().click();
  }
});

test("Inventory chart and procurement counters use neutral semantic presentation", async ({ page }) => {
  for (const viewport of [{ width: 820, height: 1180 }, { width: 1180, height: 820 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/inventory", { waitUntil: "domcontentloaded" });
    const chart = page.locator("[data-inventory-daily-movement-chart]");
    await expect(chart).toBeVisible();
    const outboundLegend = chart.getByText("Outbound entries", { exact: true }).locator("span").first();
    await expect(outboundLegend).toBeVisible();
    const outboundColor = await outboundLegend.evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(outboundColor).not.toBe("rgb(180, 35, 24)");
    expect(outboundColor).not.toBe("rgb(180, 137, 48)");
    await expectNoPageOverflow(page);

    await page.goto("/procurement", { waitUntil: "domcontentloaded" });
    const pipeline = page.getByRole("heading", { name: "Purchasing pipeline" }).locator("..").locator("..");
    await expect(pipeline).toBeVisible();
    for (const value of await pipeline.locator("strong").all()) {
      if ((await value.textContent()) !== "Unavailable") await expect(value).not.toHaveCSS("color", "rgb(180, 137, 48)");
    }
    await expectNoPageOverflow(page);
  }
});

test("PR workflow stages retain distinct readable tones", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/purchase-requests", { waitUntil: "domcontentloaded" });
  const statuses = ["manager_review", "admin_review", "finance_review", "ready_to_convert", "rejected"];
  const colors = [];
  for (const status of statuses) {
    const badge = page.locator(`[data-status="${status}"]`).first();
    await expect(badge).toBeVisible();
    await expect(badge).not.toBeEmpty();
    colors.push(await badge.evaluate((node) => getComputedStyle(node).backgroundColor));
  }
  expect(new Set(colors).size).toBe(statuses.length);
  await expectNoPageOverflow(page);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }]) {
  test(`software keyboard keeps bottom navigation below the editing viewport at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/purchase-requests", { waitUntil: "domcontentloaded" });
    const navigation = page.locator("[data-mobile-bottom-nav]");
    await expect(navigation).toBeVisible();
    const geometry = await navigation.evaluate((node) => {
      document.documentElement.dataset.mobileKeyboardOpen = "true";
      document.documentElement.style.setProperty("--sb-virtual-keyboard-inset", "240px");
      const rect = node.getBoundingClientRect();
      return { bottom: rect.bottom, transform: getComputedStyle(node).transform };
    });
    expect(geometry.bottom).toBeGreaterThan(viewport.height + 200);
    expect(geometry.transform).not.toBe("none");
  });
}

test("PR item catalogue is supplier-scoped, identifies its source, and explains invalid-line clearing", async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });
  await selectBranchWithSupplier(page, "Local E2E Source Alpha");
  const supplier = page.getByLabel("Request supplier");
  await supplier.selectOption({ label: "Local E2E Source Alpha" });
  const item = page.getByRole("combobox", { name: "Item for request line 1" });
  await item.fill("E2E-SOURCE-B-ITEM");
  // The combobox keeps the readable code + item name label after resolving an
  // exact code. Assert the stable code prefix rather than discarding the
  // operator-facing name that makes the selected line understandable.
  await expect(item).toHaveValue(/^E2E-SOURCE-B-ITEM\s-\sBeta Mapped Ingredient$/);
  await expect(page.getByRole("option", { name: /Beta Mapped Ingredient/ })).toHaveCount(0);

  await item.fill("SOURCE-A");
  const alpha = page.getByRole("option", { name: /Alpha Mapped Ingredient/ });
  await expect(alpha).toContainText("Supplier · Local E2E Source Alpha");
  await expect(alpha).toContainText("E2E-SOURCE-A-ITEM · Purchase CTN · Base KG");
  await item.press("Enter");
  await expect(item).toHaveValue(/E2E-SOURCE-A-ITEM/);

  await page.getByRole("button", { name: "Expand request details" }).click();
  await supplier.selectOption({ label: "Local E2E Source Beta" });
  await expect(item).toHaveValue("");
  const catalogueNotice = page.getByRole("status").filter({ hasText: "mapped catalogue" });
  await expect(catalogueNotice).toContainText("cleared because Local E2E Source Beta does not supply the item");
  await expect(catalogueNotice).toContainText("mapped catalogue");

  const urgency = page.getByRole("combobox", { name: "Urgency" });
  await urgency.click();
  for (const label of ["Critical", "Urgent", "Normal", "Low"]) await expect(page.getByRole("option", { name: label })).toBeVisible();
  await page.getByRole("option", { name: "Critical" }).click();
  await expect(urgency).toContainText("Critical");
  await expectNoPageOverflow(page);
});

test("rejected PR exposes the exact reason, actor, next step, and useful summary", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/purchase-requests/${REJECTED_PR_ID}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Why this request was returned", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Confirm the requested quantity and attach the kitchen usage note.", { exact: true })).toBeVisible();
  await expect(page.getByText(/Local manager/i).first()).toBeVisible();
  const summary = page.getByRole("heading", { name: "Request Summary" }).locator("..");
  await expect(summary).toBeVisible();
  for (const label of ["Request Date", "Location", "Requested Lines", "Supplier", "Est. Total Cost"]) await expect(summary.getByText(label, { exact: true })).toBeVisible();
  await expect(page.locator('[data-document-breadcrumb="E2E-PR-REJECTED"]')).toHaveCount(1);
  await expectNoPageOverflow(page);
});

test("Items applies natural numeric order before pagination", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/items?search=E2E-NAT-", { waitUntil: "domcontentloaded" });
  const codes = await page.locator('table[aria-label="Items"] tbody tr td:nth-child(2)').allTextContents();
  expect(codes.map((value) => value.trim()).slice(0, 3)).toEqual(["E2E-NAT-1", "E2E-NAT-2", "E2E-NAT-10"]);
});

test("PR numbers use natural latest-first order before pagination and remain reversible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/purchase-requests?search=E2E-SORT-PR", { waitUntil: "domcontentloaded" });
  const rows = page.getByRole("list", { name: "Purchase requests" }).getByRole("listitem");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("E2E-SORT-PR/10");
  await expect(rows.nth(1)).toContainText("E2E-SORT-PR/2");
  await expect(rows.nth(2)).toContainText("E2E-SORT-PR/1");
  await expect(rows.nth(0)).toContainText("Submitted by");
  await expect(rows.nth(0).getByText(/Central Kitchen|Local E2E/i).first()).toBeVisible();
  await expectNoPageOverflow(page);

  await page.goto("/purchase-requests?search=E2E-SORT-PR&sort=request_no&dir=asc", { waitUntil: "domcontentloaded" });
  const ascendingRows = page.getByRole("list", { name: "Purchase requests" }).getByRole("listitem");
  await expect(ascendingRows.nth(0)).toContainText("E2E-SORT-PR/1");
  await expect(ascendingRows.nth(1)).toContainText("E2E-SORT-PR/2");
  await expect(ascendingRows.nth(2)).toContainText("E2E-SORT-PR/10");
});

test("PO disclosure retains summary and only one Add line action", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/purchase-orders/new", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: "Add order line at end" })).toHaveCount(1);
  await expect(page.getByText("Add only the items included in this order.", { exact: true })).toHaveCount(0);
  const disclosure = page.getByRole("button", { name: "Collapse order details" });
  await disclosure.click();
  await expect(page.getByRole("button", { name: "Expand order details" })).toBeVisible();
  await expect(page.locator("[data-purchase-order-form-surface]")).toContainText(/Supplier not set/);
  await expect(page.locator("[data-purchase-order-setup]")).toBeHidden();
  await expectNoPageOverflow(page);
});

test("PO form and action rail share one top edge on portrait tablet", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/purchase-orders/new", { waitUntil: "domcontentloaded" });
  const formSurface = page.locator("[data-purchase-order-form-surface]");
  const railSurface = page.locator("[data-tablet-document-split] > aside [data-console-section]").first();
  await expect(formSurface).toBeVisible();
  await expect(railSurface).toBeVisible();
  const [formBox, railBox] = await Promise.all([formSurface.boundingBox(), railSurface.boundingBox()]);
  expect(formBox).not.toBeNull();
  expect(railBox).not.toBeNull();
  expect(Math.abs(formBox.y - railBox.y)).toBeLessThanOrEqual(2);
  await expectNoPageOverflow(page);
});

test("Production Jobs uses two readable filter rows on portrait tablet", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/production/jobs", { waitUntil: "domcontentloaded" });
  const filters = page.locator("form.sb-production-jobs-filters[data-unified-list-desktop='true']");
  const query = filters.locator('input[name="search"]');
  const actions = filters.locator(".unified-list-desktop-actions");
  const status = filters.locator(".sb-status-filter");
  const branch = filters.getByRole("combobox", { name: "Branch" });
  const more = filters.locator(".sb-filter-more");
  for (const control of [query, actions, status, branch, more]) await expect(control).toBeVisible();
  const [queryBox, actionsBox, statusBox, branchBox, moreBox] = await Promise.all([query.boundingBox(), actions.boundingBox(), status.boundingBox(), branch.boundingBox(), more.boundingBox()]);
  for (const box of [queryBox, actionsBox, statusBox, branchBox, moreBox]) expect(box).not.toBeNull();
  expect(Math.abs(queryBox.y - actionsBox.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(statusBox.y - branchBox.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(statusBox.y - moreBox.y)).toBeLessThanOrEqual(2);
  expect(statusBox.y).toBeGreaterThan(queryBox.y + queryBox.height);
  await expectNoPageOverflow(page);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1180, height: 820 }, { width: 1440, height: 900 }]) {
  test(`Stock Balance exposes exactly one basket owner at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/stock-balance", { waitUntil: "domcontentloaded" });
    const mobileEntry = page.getByRole("button", { name: /^Open PR basket/ });
    if (viewport.width < 1280) {
      await expect(mobileEntry).toBeVisible();
      expect(await mobileEntry.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe("rgb(180, 35, 24)");
    } else {
      await expect(mobileEntry).toBeHidden();
      await expect(page.getByRole("heading", { name: "PR basket" }).last()).toBeVisible();
    }
    await expectNoPageOverflow(page);
  });
}

test("Outlet Daily distinguishes missing Qty Sent, confirmed zero denominator, and Outlet visibility", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const today = new Date();
  const prior = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1)).toISOString().slice(0, 10);
  await page.goto(`/outlet-daily-records?date=${prior}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("combobox", { name: "Qty sent state" })).toBeVisible();
  const row = page.locator('table[aria-label="Outlet daily records"] tbody tr').filter({ hasText: "Local E2E Outlet" });
  await expect(row).toContainText("0 · verify");
  await expect(row).toContainText("Unavailable");
  await expect(row).not.toContainText("0%");

  await page.goto("/outlet-daily-records?sent_state=missing", { waitUntil: "domcontentloaded" });
  await expect(page.locator('table[aria-label="Outlet daily records"] tbody')).toContainText("Needs entry");

  await page.context().clearCookies();
  await login(page, "outlet");
  await page.goto("/outlet-daily-records", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("combobox", { name: "Qty sent state" })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Qty Sent" })).toHaveCount(0);
});
