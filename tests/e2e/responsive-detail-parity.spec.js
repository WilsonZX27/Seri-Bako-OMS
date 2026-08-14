const { test, expect } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");
const { login } = require("./helpers");

let purchaseRequestId = null;
let purchaseOrderId = null;
let admin = null;
let createdSupplierId = null;
let createdSupplierItemId = null;
let createdBranchSupplierItemId = null;

test.beforeAll(async () => {
  if (process.env.RUN_TENANT_BOUNDARY_E2E !== "1") return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)) throw new Error("Responsive detail parity is restricted to the explicitly enabled local Supabase stack.");
  admin = createClient(url, key, { auth: { persistSession: false } });
  const [company, branch, item, supplier, staff] = await Promise.all([
    admin.from("companies").select("id").limit(1).single(),
    admin.from("branches").select("id").eq("status", "active").is("deleted_at", null).limit(1).single(),
    admin.from("items").select("id,base_unit").eq("status", "active").is("deleted_at", null).limit(1).single(),
    admin.from("suppliers").select("id").eq("status", "active").is("deleted_at", null).limit(1).maybeSingle(),
    admin.from("staffs").select("id").eq("status", "active").limit(1).single(),
  ]);
  for (const [name, result] of [["company", company], ["branch", branch], ["item", item], ["supplier", supplier], ["staff", staff]]) if (result.error) throw new Error(`Responsive parity ${name} prerequisite failed: ${result.error.message}`);
  const suffix = Date.now();
  let supplierId = supplier.data?.id ?? null;
  if (!supplierId) {
    const createdSupplier = await admin.from("suppliers").insert({ company_id: company.data.id, supplier_code: `E2E-PARITY-${suffix}`, name: "Disposable Responsive Parity Supplier", status: "active" }).select("id").single();
    if (createdSupplier.error) throw createdSupplier.error;
    supplierId = createdSupplier.data.id;
    createdSupplierId = supplierId;
  }
  const supplierItem = await admin.from("supplier_items").insert({ company_id: company.data.id, supplier_id: supplierId, item_id: item.data.id, supplier_item_code: `E2E-PARITY-${suffix}`, supplier_item_name: "Disposable Responsive Parity Item", purchase_uom: item.data.base_unit, unit_cost: 1, status: "active" }).select("id").single();
  if (supplierItem.error) throw supplierItem.error;
  createdSupplierItemId = supplierItem.data.id;
  const branchSupplierItem = await admin.from("branch_supplier_items").insert({ branch_id: branch.data.id, supplier_item_id: createdSupplierItemId, item_id: item.data.id, is_preferred: false, status: "active" }).select("id").single();
  if (branchSupplierItem.error) throw branchSupplierItem.error;
  createdBranchSupplierItemId = branchSupplierItem.data.id;
  const request = await admin.from("purchase_requests").insert({ company_id: company.data.id, branch_id: branch.data.id, requested_by: staff.data.id, request_no: `PR-E2E-PARITY-${suffix}`, status: "manager_review", remarks: "Disposable responsive parity fixture." }).select("id").single();
  if (request.error) throw request.error;
  purchaseRequestId = request.data.id;
  const requestLine = await admin.from("purchase_request_lines").insert({ purchase_request_id: purchaseRequestId, item_id: item.data.id, qty: 2, uom: item.data.base_unit, reason: "Disposable responsive parity fixture." });
  if (requestLine.error) throw requestLine.error;
  const order = await admin.from("purchase_orders").insert({ company_id: company.data.id, branch_id: branch.data.id, purchase_request_id: purchaseRequestId, po_no: `PO-E2E-PARITY-${suffix}`, supplier_id: supplierId, status: "draft", approval_status: "pending", remarks: "Disposable responsive parity fixture." }).select("id").single();
  if (order.error) throw order.error;
  purchaseOrderId = order.data.id;
  const orderLine = await admin.from("purchase_order_lines").insert({ purchase_order_id: purchaseOrderId, item_id: item.data.id, qty_ordered: 2, uom: item.data.base_unit, unit_price: 1 });
  if (orderLine.error) throw orderLine.error;
});

test.afterAll(async () => {
  if (!admin) return;
  if (purchaseOrderId) {
    const lines = await admin.from("purchase_order_lines").delete().eq("purchase_order_id", purchaseOrderId);
    if (lines.error) throw lines.error;
    const order = await admin.from("purchase_orders").delete().eq("id", purchaseOrderId);
    if (order.error) throw order.error;
  }
  if (purchaseRequestId) {
    const lines = await admin.from("purchase_request_lines").delete().eq("purchase_request_id", purchaseRequestId);
    if (lines.error) throw lines.error;
    const request = await admin.from("purchase_requests").delete().eq("id", purchaseRequestId);
    if (request.error) throw request.error;
  }
  if (createdBranchSupplierItemId) {
    const mapping = await admin.from("branch_supplier_items").delete().eq("id", createdBranchSupplierItemId);
    if (mapping.error) throw mapping.error;
  }
  if (createdSupplierItemId) {
    const item = await admin.from("supplier_items").delete().eq("id", createdSupplierItemId);
    if (item.error) throw item.error;
  }
  if (createdSupplierId) {
    const supplier = await admin.from("suppliers").delete().eq("id", createdSupplierId);
    if (supplier.error) throw supplier.error;
  }
});

async function verifyParity(page, route, listName, tableName) {
  for (const width of [820, 1024, 1279]) {
    await page.setViewportSize({ width, height: 1180 });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("list", { name: listName })).toBeVisible();
    await expect(page.getByRole("region", { name: tableName })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(5);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("list", { name: listName })).toBeHidden();
  await expect(page.getByRole("region", { name: tableName })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  expect(await login(page, "superAdmin")).toBe(true);
});

test("Roles preserves one detail authority across the exact breakpoint boundary", async ({ page }) => {
  await verifyParity(page, "/roles", "Roles and permissions", "Roles and permissions");
});

test("Purchase Request detail preserves requested items through tablet widths", async ({ page }) => {
  await verifyParity(page, `/purchase-requests/${purchaseRequestId}`, "Requested items", "Requested items");
});

test("Purchase Order detail preserves ordered items through tablet widths", async ({ page }) => {
  await verifyParity(page, `/purchase-orders/${purchaseOrderId}`, "Ordered items", "Ordered items");
});
