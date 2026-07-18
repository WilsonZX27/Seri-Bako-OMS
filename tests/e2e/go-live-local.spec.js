const { test, expect } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");
const { login } = require("./helpers");

test.skip(process.env.RUN_LOCAL_GO_LIVE !== "true", "Disposable local Supabase only.");
test.describe.configure({ mode: "serial" });

const password = "Local-QA-7.22.1!";
if (process.env.RUN_LOCAL_GO_LIVE === "true") {
  for (const role of ["SUPER_ADMIN", "ADMIN", "MANAGER", "FINANCE", "KITCHEN", "PURCHASING", "OUTLET"]) {
    process.env[`TEST_${role}_PASSWORD`] = password;
  }
  Object.assign(process.env, {
    TEST_SUPER_ADMIN_EMAIL: "qa.owner@local.test",
    TEST_ADMIN_EMAIL: "qa.admin@local.test",
    TEST_MANAGER_EMAIL: "qa.manager@local.test",
    TEST_FINANCE_EMAIL: "qa.finance@local.test",
    TEST_KITCHEN_EMAIL: "qa.kitchen@local.test",
    TEST_PURCHASING_EMAIL: "qa.purchasing@local.test",
    TEST_OUTLET_EMAIL: "qa.outlet@local.test",
  });
}
const service = createClient(process.env.LOCAL_SUPABASE_URL, process.env.LOCAL_SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
let fixtures;
const workflow = {};
const runId = Date.now();

async function must(promise) {
  const result = await promise;
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

async function loginRestricted(page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("qa.restricted@local.test");
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test.beforeAll(async () => {
  const company = await must(service.from("companies").select("id").eq("company_code", "SERI-BAKO").single());
  const branch = await must(service.from("branches").select("id").eq("company_id", company.id).limit(1).single());
  const staffs = await must(service.from("staffs").select("id,email").in("email", ["qa.manager@local.test", "qa.admin@local.test", "qa.finance@local.test", "qa.kitchen@local.test", "qa.purchasing@local.test", "qa.restricted@local.test"]));
  const staff = Object.fromEntries(staffs.map((row) => [row.email, row.id]));
  const viewer = await must(service.from("roles").select("id").eq("company_id", company.id).eq("role_code", "viewer").single());
  const permissions = await must(service.from("permissions").select("id,permission_code").in("permission_code", ["dashboard.view", "purchase_request.read", "pr.cancel"]));
  const permission = Object.fromEntries(permissions.map((row) => [row.permission_code, row.id]));
  await must(service.from("role_permissions").delete().eq("role_id", viewer.id));
  await must(service.from("role_permissions").insert({ role_id: viewer.id, permission_id: permission["dashboard.view"] }));

  const supplier = await must(service.from("suppliers").insert({ supplier_code: `QA-E2E-SUP-${runId}`, name: `QA E2E Supplier ${runId}`, status: "active" }).select("id,supplier_code,name").single());
  const item = await must(service.from("items").insert({ item_code: `QA-E2E-ITEM-${runId}`, item_name: `QA E2E Item ${runId}`, category: "QA", base_unit: "PCS", purchase_unit: "PCS", supplier_id: supplier.id, cost: 2, status: "active" }).select("id,item_code,item_name").single());

  async function createPr(status, requestedBy, suffix) {
    const documentNo = `QA-E2E-${suffix}-${runId}`;
    const document = await must(service.from("documents").insert({ company_id: company.id, document_no: documentNo, document_type: "purchase_request", title: `QA ${suffix}`, status: "pending_approval", approval_status: "pending", current_step: status }).select("id").single());
    const pr = await must(service.from("purchase_requests").insert({ company_id: company.id, document_id: document.id, request_no: documentNo, requested_by: requestedBy, branch_id: branch.id, status }).select("id").single());
    await must(service.from("documents").update({ related_entity_type: "purchase_request", related_entity_id: pr.id }).eq("id", document.id));
    return pr.id;
  }

  fixtures = {
    manager: await createPr("manager_review", staff["qa.manager@local.test"], "MANAGER"),
    admin: await createPr("admin_review", staff["qa.admin@local.test"], "ADMIN"),
    finance: await createPr("finance_review", staff["qa.finance@local.test"], "FINANCE"),
    restricted: (await must(service.from("purchase_requests").insert({
      company_id: company.id,
      request_no: `QA-E2E-RESTRICTED-${runId}`,
      requested_by: staff["qa.restricted@local.test"],
      branch_id: branch.id,
      status: "draft",
    }).select("id").single())).id,
    viewerRole: viewer.id,
    supplier,
    item,
  };
});

function criticalConsole(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("Kitchen receives clear empty-line validation on mobile", async ({ page }) => {
  await login(page, "kitchen");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/purchase-requests/new");
  await page.getByRole("button", { name: "Page actions" }).click();
  await page.getByRole("button", { name: "Create PR" }).click();
  await expect(page.getByText("Add at least one item before creating this purchase request.").first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("Kitchen creates and submits a branch-matched PR", async ({ page }) => {
  const errors = criticalConsole(page);
  await login(page, "kitchen");
  await page.goto("/purchase-requests/new");
  await page.getByPlaceholder("Search by item code or item name").fill(`${fixtures.item.item_code} - ${fixtures.item.item_name}`);
  await page.locator('input[name="line_qty"]').fill("5");
  await page.locator('textarea[name="remarks"]').fill(`QA-E2E-PR-${runId}`);
  await page.getByRole("button", { name: "Create PR" }).click();
  await expect(page).toHaveURL(/\/purchase-requests\/[0-9a-f-]+/);
  workflow.prId = page.url().match(/purchase-requests\/([0-9a-f-]+)/)[1];
  await page.getByRole("button", { name: "Submit to Manager Review" }).click();
  await expect(page).toHaveURL(/success=/);
  await expect(page.getByText("Manager Review", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Manager Approve" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("branch-matched Manager reviews without a Server Component error", async ({ page }) => {
  const errors = criticalConsole(page);
  await login(page, "manager");
  await page.goto(`/purchase-requests/${workflow.prId}`);
  await page.getByRole("button", { name: "Manager Approve" }).click();
  await expect(page).toHaveURL(/success=/);
  await expect(page.getByText("Admin Review", { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("Admin reviews when optional document data is denied", async ({ page }) => {
  const errors = criticalConsole(page);
  await login(page, "admin");
  await page.goto(`/purchase-requests/${workflow.prId}`);
  await page.getByRole("button", { name: "Complete Admin Review" }).click();
  await expect(page).toHaveURL(/success=/);
  await expect(page.getByText("Finance Review", { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("Finance reviews and Purchasing converts the current ready state", async ({ browser }) => {
  const financePage = await browser.newPage();
  const purchasingPage = await browser.newPage();
  await login(financePage, "finance");
  await financePage.goto(`/purchase-requests/${workflow.prId}`);
  await financePage.getByRole("button", { name: "Complete Finance Review" }).click();
  await expect(financePage).toHaveURL(/success=/);
  await expect(financePage.getByText("Ready to Convert", { exact: true }).first()).toBeVisible();

  const errors = criticalConsole(purchasingPage);
  await login(purchasingPage, "purchasing");
  await purchasingPage.goto(`/purchase-requests/${workflow.prId}`);
  await expect(purchasingPage.locator('input[name="autocount_po_no"]')).toBeVisible();
  await purchasingPage.locator('input[name="autocount_po_no"]').fill(`QA-E2E-PO-${runId}`);
  await purchasingPage.getByRole("button", { name: "Convert to Purchase Order" }).click();
  await expect(purchasingPage).toHaveURL(/\/purchase-orders\/[0-9a-f-]+/);
  workflow.poId = purchasingPage.url().match(/purchase-orders\/([0-9a-f-]+)/)[1];
  await purchasingPage.getByRole("button", { name: "Send to supplier" }).click();
  await expect(purchasingPage).toHaveURL(/success=/);
  await expect(purchasingPage.getByText("Sent", { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("Owner receives and posts the converted PO", async ({ page }) => {
  await login(page, "superAdmin");
  await page.goto(`/purchase-orders/${workflow.poId}`);
  await page.getByRole("link", { name: "Receive goods" }).click();
  await page.locator('input[name="line_received_qty"]').fill("5");
  await page.getByRole("button", { name: "Create Draft GRN" }).click();
  await expect(page).toHaveURL(/\/goods-receivings\/[0-9a-f-]+/);
  await page.getByRole("button", { name: "Post to stock" }).click();
  await expect(page.getByText("Posted", { exact: true }).first()).toBeVisible();
});

test("Manager approval advances once and remains readable", async ({ page }) => {
  await login(page, "manager");
  await page.goto(`/purchase-requests/${fixtures.manager}`);
  await page.getByRole("button", { name: "Manager Approve" }).click();
  await expect(page).toHaveURL(/success=/);
  await expect(page.getByText("Admin Review", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Manager Approve" })).toHaveCount(0);
});

test("Administrator completes only Admin Review", async ({ page }) => {
  await login(page, "admin");
  await page.goto(`/purchase-requests/${fixtures.admin}`);
  await page.getByRole("button", { name: "Complete Admin Review" }).click();
  await expect(page).toHaveURL(/success=/);
  await expect(page.getByText("Finance Review", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Complete Finance Review" })).toHaveCount(0);
});

test("Finance completes Finance Review without Manager controls", async ({ page }) => {
  await login(page, "finance");
  await page.goto(`/purchase-requests/${fixtures.finance}`);
  await page.getByRole("button", { name: "Complete Finance Review" }).click();
  await expect(page).toHaveURL(/success=/);
  await expect(page.getByText("Ready to Convert", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Manager Approve" })).toHaveCount(0);
});

test("permission changes update navigation, route guard, and server action", async ({ browser }) => {
  const ownerPage = await browser.newPage();
  const restrictedPage = await browser.newPage();
  await login(ownerPage, "superAdmin");
  await loginRestricted(restrictedPage);

  await expect(restrictedPage.locator('nav a[href="/purchase-requests"]')).toHaveCount(0);
  await restrictedPage.goto("/purchase-requests");
  await expect(restrictedPage).not.toHaveURL(/\/purchase-requests$/);

  await ownerPage.goto(`/roles/${fixtures.viewerRole}`);
  await ownerPage.getByLabel("Allow Purchase Requests purchase_request.read").locator("xpath=ancestor::details[last()]/summary[1]").click();
  await ownerPage.getByLabel("Allow Purchase Requests purchase_request.read").check();
  await ownerPage.getByLabel("Allow Purchase Requests pr.cancel").locator("xpath=ancestor::details[last()]/summary[1]").click();
  await ownerPage.getByLabel("Allow Purchase Requests pr.cancel").check();
  await ownerPage.getByRole("button", { name: "Save permissions" }).click();
  await expect(ownerPage.getByText("Role permissions updated.")).toBeVisible();

  await restrictedPage.goto("/dashboard");
  await restrictedPage.getByRole("button", { name: "Procurement" }).click();
  await expect(restrictedPage.locator('nav a[href="/purchase-requests"]')).toBeVisible();
  await restrictedPage.goto(`/purchase-requests/${fixtures.restricted}`);
  await restrictedPage.getByRole("button", { name: "Cancel draft" }).click();
  await expect(restrictedPage.getByText("Cancelled", { exact: true }).first()).toBeVisible();

  await ownerPage.goto(`/roles/${fixtures.viewerRole}`);
  await ownerPage.getByLabel("Allow Purchase Requests purchase_request.read").locator("xpath=ancestor::details[last()]/summary[1]").click();
  await ownerPage.getByLabel("Allow Purchase Requests purchase_request.read").uncheck();
  await ownerPage.getByLabel("Allow Purchase Requests pr.cancel").locator("xpath=ancestor::details[last()]/summary[1]").click();
  await ownerPage.getByLabel("Allow Purchase Requests pr.cancel").uncheck();
  await ownerPage.getByRole("button", { name: "Save permissions" }).click();
  await expect(ownerPage.getByText("Role permissions updated.")).toBeVisible();
  await restrictedPage.goto("/dashboard");
  await expect(restrictedPage.locator('nav a[href="/purchase-requests"]')).toHaveCount(0);
  await restrictedPage.goto("/purchase-requests");
  await expect(restrictedPage).not.toHaveURL(/\/purchase-requests$/);
});
