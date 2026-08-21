const fs = require("fs");
const { test, expect } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");
const { login } = require("./helpers");

function loadEnv() {
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

test.describe("local progressive receiving UOM learning", () => {
  test.describe.configure({ mode: "serial" });
  let admin;
  let fixture;
  const created = { firstPo: null, firstGrn: null, secondPo: null, secondGrn: null, floatingPo: null, floatingGrn: null };

  test.beforeAll(async () => {
    loadEnv();
    if (process.env.RUN_TENANT_BOUNDARY_E2E !== "1") return;
    const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!localUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY || !["127.0.0.1", "localhost"].includes(new URL(localUrl).hostname)) {
      throw new Error("Progressive receiving evidence is restricted to an explicitly enabled local Supabase stack.");
    }
    admin = createClient(localUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const company = await must(admin.from("companies").select("id").eq("status", "active").limit(1).single(), "company");
    const branch = await must(admin.from("branches").select("id").eq("company_id", company.id).eq("status", "active").limit(1).single(), "branch");
    const owner = await must(admin.from("staffs").select("id").eq("email", process.env.TEST_SUPER_ADMIN_EMAIL).single(), "owner");
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const supplier = await must(admin.from("suppliers").insert({
      company_id: company.id,
      supplier_code: `QA-UOM-SUP-${suffix}`,
      name: `QA Progressive Supplier ${suffix}`,
      status: "active",
    }).select("id").single(), "supplier");
    const item = await must(admin.from("items").insert({
      company_id: company.id,
      item_code: `QA-UOM-CTN-${suffix}`,
      item_name: `QA Progressive CTN Item ${suffix}`,
      category: "QA",
      purchase_unit: "CTN",
      base_unit: "KG",
      conversion_to_base_unit: 1,
      cost: 60,
      safety_stock: 0,
      moq: 1,
      status: "active",
    }).select("id").single(), "item");
    const floatingItem = await must(admin.from("items").insert({
      company_id: company.id,
      item_code: `QA-UOM-BAG-${suffix}`,
      item_name: `QA Floating BAG Item ${suffix}`,
      category: "QA",
      purchase_unit: "BAG",
      base_unit: "KG",
      conversion_to_base_unit: 1,
      cost: 30,
      safety_stock: 0,
      moq: 1,
      status: "active",
    }).select("id").single(), "floating item");
    // The null factor is intentional: the first receipt must learn it from
    // actual supplier and base quantities rather than pre-blocking setup.
    const supplierItem = await must(admin.from("supplier_items").insert({
      company_id: company.id,
      supplier_id: supplier.id,
      item_id: item.id,
      supplier_item_code: `QA-UOM-SI-${suffix}`,
      supplier_item_name: item.item_name,
      purchase_uom: "CTN",
      conversion_to_base_uom: null,
      unit_cost: 120,
      moq: 1,
      lead_time_days: 1,
      status: "active",
      created_by: owner.id,
      updated_by: owner.id,
    }).select("id").single(), "supplier item");
    const floatingSupplierItem = await must(admin.from("supplier_items").insert({
      company_id: company.id,
      supplier_id: supplier.id,
      item_id: floatingItem.id,
      supplier_item_code: `QA-UOM-BAG-SI-${suffix}`,
      supplier_item_name: floatingItem.item_name,
      purchase_uom: "BAG",
      conversion_to_base_uom: null,
      unit_cost: 50,
      moq: 1,
      lead_time_days: 1,
      status: "active",
      created_by: owner.id,
      updated_by: owner.id,
    }).select("id").single(), "floating supplier item");
    const sequenceRows = [];
    const existingSequence = await must(admin.from("document_sequences").select("id").eq("company_id", company.id).eq("document_type", "goods_receiving").is("deleted_at", null).limit(1), "goods receiving sequence");
    if (!existingSequence.length) {
      const sequence = await must(admin.from("document_sequences").insert({
        company_id: company.id,
        document_type: "goods_receiving",
        prefix: "GRN",
        next_number: 1,
        padding: 5,
        reset_frequency: "yearly",
        status: "active",
        created_by: owner.id,
        updated_by: owner.id,
      }).select("id").single(), "goods receiving sequence create");
      sequenceRows.push(sequence.id);
    }
    fixture = { company: company.id, branch: branch.id, owner: owner.id, supplier: supplier.id, supplierItem: supplierItem.id, item: item.id, floatingSupplierItem: floatingSupplierItem.id, floatingItem: floatingItem.id, itemName: item.item_name, suffix, sequenceRows };
  });

  async function createApprovedPo(quantity, marker, itemId = fixture.item, uom = "CTN", unitPrice = 120) {
    const poId = crypto.randomUUID();
    const documentId = crypto.randomUUID();
    const lineId = crypto.randomUUID();
    await must(admin.from("documents").insert({
      id: documentId,
      company_id: fixture.company,
      document_no: `QA-UOM-DOC-${fixture.suffix}-${marker}`,
      document_type: "purchase_order",
      title: `QA UOM ${marker}`,
      status: "approved",
      approval_status: "approved",
      current_step: "Approved",
      related_entity_type: "purchase_order",
      related_entity_id: poId,
      created_by: fixture.owner,
      updated_by: fixture.owner,
    }), "PO document");
    await must(admin.from("purchase_orders").insert({
      id: poId,
      company_id: fixture.company,
      document_id: documentId,
      purchase_request_id: null,
      branch_id: fixture.branch,
      po_no: `QA-UOM-PO-${fixture.suffix}-${marker}`,
      supplier_id: fixture.supplier,
      order_date: new Date().toISOString().slice(0, 10),
      expected_delivery_date: new Date().toISOString().slice(0, 10),
      status: "approved",
      approval_status: "approved",
      remarks: `Progressive UOM fixture ${marker}`,
      created_by: fixture.owner,
      updated_by: fixture.owner,
      idempotency_key: crypto.randomUUID(),
    }).select("id").single(), "purchase order");
    await must(admin.from("purchase_order_lines").insert({
      id: lineId,
      purchase_order_id: poId,
      item_id: itemId,
      qty_ordered: quantity,
      qty_received: 0,
      qty_cancelled: 0,
      uom,
      unit_price: unitPrice,
    }), "purchase order line");
    return { poId, lineId, documentId };
  }

  async function postWithException(page, reason) {
    const postForm = page.locator('form:visible').filter({ has: page.getByRole("button", { name: /Post Receiving to Stock/i }) }).first();
    const exception = postForm.locator('textarea[name="do_exception_reason"]');
    if (await exception.count()) await exception.fill(reason);
    await postForm.getByRole("button", { name: /Post Receiving to Stock/i }).click();
    const grnId = new URL(page.url()).pathname.split("/").pop();
    await expect.poll(async () => (await admin.from("goods_receivings").select("status").eq("id", grnId).single()).data?.status, { timeout: 30_000 }).toBe("posted");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText(/Posted/i);
  }

  test.afterAll(async () => {
    if (!admin || !fixture) return;
    for (const grnId of [created.floatingGrn, created.secondGrn, created.firstGrn].filter(Boolean)) {
      const grn = await admin.from("goods_receivings").select("document_id").eq("id", grnId).maybeSingle();
      const movements = await admin.from("stock_transactions").select("id").eq("reference_id", grnId);
      const movementIds = (movements.data ?? []).map((row) => row.id);
      if (movementIds.length) await admin.from("stock_transaction_lines").delete().in("stock_transaction_id", movementIds);
      await admin.from("stock_transactions").delete().eq("reference_id", grnId);
      await admin.from("goods_receiving_lines").delete().eq("goods_receiving_id", grnId);
      await admin.from("goods_receivings").delete().eq("id", grnId);
      if (grn.data?.document_id) await admin.from("documents").delete().eq("id", grn.data.document_id);
    }
    for (const po of [created.floatingPo, created.secondPo, created.firstPo].filter(Boolean)) {
      const row = await admin.from("purchase_orders").select("document_id").eq("id", po.poId).maybeSingle();
      await admin.from("purchase_order_lines").delete().eq("purchase_order_id", po.poId);
      await admin.from("purchase_orders").delete().eq("id", po.poId);
      if (row.data?.document_id) await admin.from("documents").delete().eq("id", row.data.document_id);
    }
    await admin.from("supplier_uom_conversion_audit").delete().eq("supplier_id", fixture.supplier);
    await admin.from("branch_supplier_items").delete().eq("item_id", fixture.item);
    await admin.from("branch_supplier_items").delete().eq("item_id", fixture.floatingItem);
    await admin.from("supplier_items").delete().eq("id", fixture.supplierItem);
    await admin.from("supplier_items").delete().eq("id", fixture.floatingSupplierItem);
    await admin.from("items").delete().eq("id", fixture.item);
    await admin.from("items").delete().eq("id", fixture.floatingItem);
    await admin.from("suppliers").delete().eq("id", fixture.supplier);
    for (const id of fixture.sequenceRows ?? []) await admin.from("document_sequences").delete().eq("id", id);
  });

  test("learns an unknown 2 CTN to 24 KG conversion and remembers it", async ({ page }) => {
    test.skip(!admin, "Local Supabase fixture was not enabled.");
    created.firstPo = await createApprovedPo(2, "FIRST");
    await login(page, "superAdmin");
    await page.goto(`/goods-receivings/new?po_id=${created.firstPo.poId}`, { waitUntil: "domcontentloaded" });
    const purchaseQty = page.locator('input[aria-label="Received in purchase UOM CTN"]');
    const baseQty = page.locator('input[aria-label="Received in base UOM KG"]');
    await expect(page.locator("body")).toContainText(/No saved conversion yet/i);
    await purchaseQty.fill("2");
    await baseQty.fill("24");
    await page.getByLabel(/Remember this supplier conversion for future deliveries/i).check();
    await page.getByRole("button", { name: /Save receiving draft/i }).first().click();
    await page.waitForURL(/\/goods-receivings\/[0-9a-f-]+/i, { timeout: 30_000 });
    created.firstGrn = new URL(page.url()).pathname.split("/").pop();
    await postWithException(page, "QA UOM receipt recorded without supplier DO attachment.");

    const line = await must(admin.from("goods_receiving_lines").select("received_qty,received_base_qty,conversion_to_base_uom_snapshot,conversion_source,remember_conversion").eq("goods_receiving_id", created.firstGrn).single(), "first GRN line");
    expect(Number(line.received_qty)).toBe(2);
    expect(Number(line.received_base_qty)).toBe(24);
    expect(Number(line.conversion_to_base_uom_snapshot)).toBe(12);
    expect(line.remember_conversion).toBe(true);
    expect(line.conversion_source).toMatch(/receiving/i);
    const receivingState = await must(admin.from("goods_receivings").select("status,posted_at").eq("id", created.firstGrn).single(), "first GRN status");
    expect(receivingState.status).toBe("posted");
    const mappings = await must(admin.from("supplier_items").select("id,purchase_uom,conversion_to_base_uom,status,deleted_at").eq("supplier_id", fixture.supplier).eq("item_id", fixture.item), "learned supplier mappings");
    const mapping = mappings.find((row) => row.id === fixture.supplierItem) ?? mappings[0];
    expect(mapping).toBeTruthy();
    const auditRows = await must(admin.from("supplier_uom_conversion_audit").select("before_conversion,after_conversion,goods_receiving_id,supplier_id,item_id").eq("goods_receiving_id", created.firstGrn), "conversion audits");
    expect(Number(mapping.conversion_to_base_uom)).toBe(12);
    const audit = await must(admin.from("supplier_uom_conversion_audit").select("before_conversion,after_conversion,goods_receiving_id").eq("goods_receiving_id", created.firstGrn).single(), "conversion audit");
    expect(audit.before_conversion).toBeNull();
    expect(Number(audit.after_conversion)).toBe(12);
    expect(audit.goods_receiving_id).toBe(created.firstGrn);
    const movement = await must(admin.from("stock_transactions").select("quantity_in,unit_cost").eq("reference_id", created.firstGrn).single(), "base stock movement");
    expect(Number(movement.quantity_in)).toBe(24);
    expect(Number(movement.unit_cost)).toBe(10);
  });

  test("uses the remembered conversion automatically on the next receipt", async ({ page }) => {
    test.skip(!admin, "Local Supabase fixture was not enabled.");
    created.secondPo = await createApprovedPo(1, "SECOND");
    await login(page, "superAdmin");
    await page.goto(`/goods-receivings/new?po_id=${created.secondPo.poId}`, { waitUntil: "domcontentloaded" });
    const purchaseQty = page.locator('input[aria-label="Received in purchase UOM CTN"]');
    const baseQty = page.locator('input[aria-label="Received in base UOM KG"]');
    await expect(page.locator("body")).toContainText(/1 CTN = 12 KG/i);
    await expect(baseQty).toHaveAttribute("readonly", "");
    await expect(page.getByLabel(/Remember this supplier conversion for future deliveries/i)).toHaveCount(0);
    await purchaseQty.fill("1");
    await expect(baseQty).toHaveValue(/12/);
    await page.getByRole("button", { name: /Save receiving draft/i }).first().click();
    await page.waitForURL(/\/goods-receivings\/[0-9a-f-]+/i, { timeout: 30_000 });
    created.secondGrn = new URL(page.url()).pathname.split("/").pop();
    await postWithException(page, "QA remembered UOM conversion verified.");
    const line = await must(admin.from("goods_receiving_lines").select("received_qty,received_base_qty,conversion_to_base_uom_snapshot,remember_conversion").eq("goods_receiving_id", created.secondGrn).single(), "second GRN line");
    expect(Number(line.received_qty)).toBe(1);
    expect(Number(line.received_base_qty)).toBe(12);
    expect(Number(line.conversion_to_base_uom_snapshot)).toBe(12);
    expect(line.remember_conversion).toBe(false);
    const movement = await must(admin.from("stock_transactions").select("quantity_in,unit_cost").eq("reference_id", created.secondGrn).single(), "second base stock movement");
    expect(Number(movement.quantity_in)).toBe(12);
    expect(Number(movement.unit_cost)).toBe(10);
  });

  test("keeps a floating 2 BAG to 17.4 KG receipt as a one-time snapshot", async ({ page }) => {
    test.skip(!admin, "Local Supabase fixture was not enabled.");
    created.floatingPo = await createApprovedPo(2, "FLOAT", fixture.floatingItem, "BAG", 50);
    await login(page, "superAdmin");
    await page.goto(`/goods-receivings/new?po_id=${created.floatingPo.poId}`, { waitUntil: "domcontentloaded" });
    const purchaseQty = page.locator('input[aria-label="Received in purchase UOM BAG"]');
    const baseQty = page.locator('input[aria-label="Received in base UOM KG"]');
    await expect(page.locator("body")).toContainText(/No saved conversion yet/i);
    await purchaseQty.fill("2");
    await baseQty.fill("17.4");
    const remember = page.getByLabel(/Remember this supplier conversion for future deliveries/i);
    await expect(remember).toBeVisible();
    await expect(remember).not.toBeChecked();
    await page.getByRole("button", { name: /Save receiving draft/i }).first().click();
    await page.waitForURL(/\/goods-receivings\/[0-9a-f-]+/i, { timeout: 30_000 });
    created.floatingGrn = new URL(page.url()).pathname.split("/").pop();
    await postWithException(page, "QA floating BAG conversion is receipt-specific.");
    const line = await must(admin.from("goods_receiving_lines").select("received_qty,received_base_qty,conversion_to_base_uom_snapshot,remember_conversion").eq("goods_receiving_id", created.floatingGrn).single(), "floating GRN line");
    expect(Number(line.received_qty)).toBe(2);
    expect(Number(line.received_base_qty)).toBe(17.4);
    expect(Number(line.conversion_to_base_uom_snapshot)).toBe(8.7);
    expect(line.remember_conversion).toBe(false);
    const mapping = await must(admin.from("supplier_items").select("conversion_to_base_uom").eq("id", fixture.floatingSupplierItem).single(), "floating supplier mapping");
    expect(mapping.conversion_to_base_uom).toBeNull();
    const audits = await must(admin.from("supplier_uom_conversion_audit").select("id").eq("goods_receiving_id", created.floatingGrn), "floating conversion audit");
    expect(audits).toHaveLength(0);
    const movement = await must(admin.from("stock_transactions").select("quantity_in,unit_cost").eq("reference_id", created.floatingGrn).single(), "floating base stock movement");
    expect(Number(movement.quantity_in)).toBe(17.4);
    expect(Number(movement.unit_cost)).toBeCloseTo(50 / 8.7, 4);
  });
});
