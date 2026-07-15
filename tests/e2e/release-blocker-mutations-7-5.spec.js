const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

function loadLocalEnv() {
  for (const file of [".env.local", ".env.test.local"]) {
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (!match) continue;
      process.env[match[1].trim()] ||= match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

async function adminClient() {
  loadLocalEnv();
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const { error } = await client.auth.signInWithPassword({ email: process.env.TEST_SUPER_ADMIN_EMAIL, password: process.env.TEST_SUPER_ADMIN_PASSWORD });
  if (error) throw error;
  return client;
}

async function fixtureContext(client) {
  const { data: staff, error: staffError } = await client.from("staffs").select("id,company_id,default_branch_id").eq("email", process.env.TEST_SUPER_ADMIN_EMAIL).single();
  const { data: supplier, error: supplierError } = await client.from("suppliers").select("id,supplier_code,name").eq("status", "active").is("deleted_at", null).limit(1).single();
  const { data: item, error: itemError } = await client.from("items").select("id,base_unit").eq("status", "active").is("deleted_at", null).limit(1).single();
  if (staffError || supplierError || itemError) throw staffError || supplierError || itemError;
  return { staff, supplier, item };
}

test.describe("Sprint 7.5 isolated blocker mutations", () => {
  test.skip(process.env.RUN_RELEASE_BLOCKER_MUTATIONS !== "true", "Set RUN_RELEASE_BLOCKER_MUTATIONS=true only after migration 053 is applied to the isolated linked project.");

  test("PR conversion is atomic and idempotent", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!hasAccount("superAdmin"), "Super Admin credentials are required.");
    const client = await adminClient();
    const { staff, supplier, item } = await fixtureContext(client);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const requestIds = [];
    const orderIds = [];
    const documentIds = [];

    async function createReadyRequest(label) {
      const { data: request, error } = await client.from("purchase_requests").insert({
        company_id: staff.company_id,
        request_no: `QA75-${label}-${suffix}`,
        requested_by: staff.id,
        branch_id: staff.default_branch_id,
        status: "ready_to_convert",
        remarks: "Isolated Sprint 7.5 transaction fixture",
        created_by: staff.id,
        updated_by: staff.id,
      }).select("id,status").single();
      if (error) throw error;
      requestIds.push(request.id);
      const { error: lineError } = await client.from("purchase_request_lines").insert({
        purchase_request_id: request.id,
        item_id: item.id,
        qty: 1,
        uom: item.base_unit,
        estimated_unit_cost: 1,
        suggested_supplier_id: supplier.id,
      });
      if (lineError) throw lineError;
      return request;
    }

    try {
      const request = await createReadyRequest("OK");
      const poNo = `QA75-PO-${suffix}`;
      const first = await client.rpc("convert_purchase_request_to_purchase_order", { target_purchase_request_id: request.id, target_po_no: poNo });
      expect(first.error).toBeNull();
      expect(first.data).toHaveLength(1);
      expect(first.data[0].already_existed).toBe(false);
      orderIds.push(first.data[0].purchase_order_id);

      const second = await client.rpc("convert_purchase_request_to_purchase_order", { target_purchase_request_id: request.id, target_po_no: poNo });
      expect(second.error).toBeNull();
      expect(second.data[0]).toMatchObject({ purchase_order_id: first.data[0].purchase_order_id, already_existed: true });
      const { data: orders } = await client.from("purchase_orders").select("id,document_id").eq("purchase_request_id", request.id).is("deleted_at", null);
      expect(orders).toHaveLength(1);
      documentIds.push(...orders.map((order) => order.document_id).filter(Boolean));
      const { count: lineCount } = await client.from("purchase_order_lines").select("id", { count: "exact", head: true }).eq("purchase_order_id", first.data[0].purchase_order_id);
      expect(lineCount).toBe(1);
      const { data: convertedRequest } = await client.from("purchase_requests").select("status").eq("id", request.id).single();
      expect(convertedRequest.status).toBe("converted_to_po");
      await login(page, "superAdmin");
      await page.goto(`/purchase-orders/${first.data[0].purchase_order_id}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(poNo, { exact: false }).first()).toBeVisible();

      const concurrentRequest = await createReadyRequest("CONCURRENT");
      const concurrentPoNo = `QA75-PO-CONCURRENT-${suffix}`;
      const concurrent = await Promise.all([
        client.rpc("convert_purchase_request_to_purchase_order", { target_purchase_request_id: concurrentRequest.id, target_po_no: concurrentPoNo }),
        client.rpc("convert_purchase_request_to_purchase_order", { target_purchase_request_id: concurrentRequest.id, target_po_no: concurrentPoNo }),
      ]);
      expect(concurrent.every((result) => !result.error)).toBe(true);
      expect(new Set(concurrent.map((result) => result.data[0].purchase_order_id)).size).toBe(1);
      expect(concurrent.map((result) => result.data[0].already_existed).sort()).toEqual([false, true]);
      orderIds.push(concurrent[0].data[0].purchase_order_id);
      const { count: concurrentCount } = await client.from("purchase_orders").select("id", { count: "exact", head: true }).eq("purchase_request_id", concurrentRequest.id).is("deleted_at", null);
      expect(concurrentCount).toBe(1);

      const failingRequest = await createReadyRequest("FAIL");
      const failed = await client.rpc("convert_purchase_request_to_purchase_order", { target_purchase_request_id: failingRequest.id, target_po_no: poNo });
      expect(failed.error?.message).toMatch(/already used/i);
      const { count: partialCount } = await client.from("purchase_orders").select("id", { count: "exact", head: true }).eq("purchase_request_id", failingRequest.id).is("deleted_at", null);
      expect(partialCount).toBe(0);
      const { data: unchangedRequest } = await client.from("purchase_requests").select("status").eq("id", failingRequest.id).single();
      expect(unchangedRequest.status).toBe("ready_to_convert");
    } finally {
      for (const orderId of orderIds) {
        await client.from("purchase_order_lines").delete().eq("purchase_order_id", orderId);
        await client.from("purchase_orders").update({ deleted_at: new Date().toISOString(), status: "cancelled" }).eq("id", orderId);
      }
      for (const requestId of requestIds) {
        await client.from("purchase_request_lines").delete().eq("purchase_request_id", requestId);
        await client.from("purchase_requests").update({ deleted_at: new Date().toISOString(), status: "cancelled" }).eq("id", requestId);
      }
      for (const documentId of documentIds) await client.from("documents").update({ deleted_at: new Date().toISOString() }).eq("id", documentId);
      await client.auth.signOut();
    }
  });

  test("shared attachment upload persists, opens, downloads, validates, and cleans up", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!hasAccount("superAdmin"), "Super Admin credentials are required.");
    const client = await adminClient();
    const { staff } = await fixtureContext(client);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let documentId;
    try {
      const { data: document, error } = await client.from("documents").insert({
        company_id: staff.company_id,
        document_no: `QA75-ATT-${suffix}`,
        document_type: "qa_attachment",
        title: "Sprint 7.5 attachment fixture",
        status: "draft",
        approval_status: "draft",
        created_by: staff.id,
        updated_by: staff.id,
      }).select("id").single();
      if (error) throw error;
      documentId = document.id;

      await login(page, "superAdmin");
      await page.goto(`/documents/${documentId}`, { waitUntil: "domcontentloaded" });
      const fileInput = page.locator('input[type="file"][name="file"]').first();
      await fileInput.setInputFiles({ name: `QA75-${suffix}.txt`, mimeType: "text/plain", buffer: Buffer.from("Sprint 7.5 attachment verification") });
      const uploadButton = page.getByRole("button", { name: "Upload attachment" }).first();
      await uploadButton.click({ noWaitAfter: true });
      await expect(page.getByText(new RegExp(`QA75-${suffix}`)).first()).toBeVisible();
      const attachmentRow = page.locator("div.divide-y.border-t > div").filter({ hasText: `QA75-${suffix}` }).first();
      await expect(attachmentRow.getByRole("link", { name: "View" })).toBeVisible();
      await expect(attachmentRow.getByRole("link", { name: "Download" })).toBeVisible();
      const viewResponse = await page.request.get(await attachmentRow.getByRole("link", { name: "View" }).getAttribute("href"));
      expect(viewResponse.ok()).toBe(true);
      const downloadResponse = await page.request.get(await attachmentRow.getByRole("link", { name: "Download" }).getAttribute("href"));
      expect(downloadResponse.ok()).toBe(true);
      const { data: metadata } = await client.from("attachments").select("id,storage_path").eq("entity_id", documentId).eq("status", "active").single();
      expect(metadata.storage_path).toContain(`${staff.company_id}/${documentId}/`);
      const { count: metadataCount } = await client.from("attachments").select("id", { count: "exact", head: true }).eq("entity_id", documentId).eq("status", "active");
      expect(metadataCount).toBe(1);
      const publicUrl = client.storage.from("document-attachments").getPublicUrl(metadata.storage_path).data.publicUrl;
      expect((await page.request.get(publicUrl)).ok()).toBe(false);
      const crossCompanyUpload = await client.storage.from("document-attachments").upload(`${crypto.randomUUID()}/${documentId}/cross-company.txt`, Buffer.from("blocked"), { contentType: "text/plain" });
      expect(crossCompanyUpload.error).not.toBeNull();

      await page.context().clearCookies();
      const deniedResponse = await page.request.get(`/api/attachments/${metadata.id}`, { maxRedirects: 0 });
      expect([307, 403]).toContain(deniedResponse.status());
      const anonymousClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
      const deniedUpload = await anonymousClient.storage.from("document-attachments").upload(`${staff.company_id}/${documentId}/denied.txt`, Buffer.from("blocked"), { contentType: "text/plain" });
      expect(deniedUpload.error).not.toBeNull();
      await login(page, "superAdmin");

      await page.goto(`/documents/${documentId}`, { waitUntil: "domcontentloaded" });
      const removableRow = page.locator("div.divide-y.border-t > div").filter({ hasText: `QA75-${suffix}` }).first();
      await removableRow.getByRole("button", { name: "Remove" }).click();
      await expect(removableRow).toHaveCount(0);
      await fileInput.setInputFiles({ name: "unsupported.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("invalid") });
      await page.getByRole("button", { name: "Upload attachment" }).first().click();
      await expect(page.getByText("This file type is not supported.")).toBeVisible();
      await fileInput.setInputFiles({ name: "too-large.txt", mimeType: "text/plain", buffer: Buffer.alloc(10 * 1024 * 1024 + 1, "x") });
      await page.getByRole("button", { name: "Upload attachment" }).first().click();
      await expect(page.getByText("Attachment must be 10 MB or smaller.")).toBeVisible({ timeout: 30_000 });
    } finally {
      if (documentId) {
        const { data: attachments } = await client.from("attachments").select("id,storage_path").eq("entity_id", documentId);
        for (const attachment of attachments ?? []) {
          if (attachment.storage_path) await client.storage.from("document-attachments").remove([attachment.storage_path]);
          await client.from("attachments").update({ status: "archived", deleted_at: new Date().toISOString() }).eq("id", attachment.id);
        }
        await client.from("documents").update({ deleted_at: new Date().toISOString() }).eq("id", documentId);
      }
      await client.auth.signOut();
    }
  });

  test("item import resolves one supplier mapping and rejects unknown supplier codes", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!hasAccount("superAdmin"), "Super Admin credentials are required.");
    const client = await adminClient();
    const { supplier } = await fixtureContext(client);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const itemCode = `QA75-IMP-${suffix}`;
    try {
      await login(page, "superAdmin");
      await page.goto("/imports/items", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Edit in table" }).click();
      await page.getByRole("button", { name: "Add blank row" }).click();
      const headers = await page.locator("table thead th").allTextContents();
      const inputs = page.locator("table tbody tr").first().locator("input");
      for (const [column, value] of Object.entries({ item_code: itemCode, item_name: "Sprint 7.5 import fixture", category: "QA", base_uom: "PCS", supplier_code: supplier.supplier_code, supplier_price: "2.50", purchase_uom: "PCS", minimum_order_qty: "3", lead_time_days: "2" })) {
        await inputs.nth(headers.findIndex((header) => header.trim() === column) - 1).fill(value);
      }
      await page.getByRole("button", { name: "Proceed / Confirm Import" }).click();
      await expect(page.getByText(/Supplier mappings created: 1/)).toBeVisible();
      const { data: item } = await client.from("items").select("id,supplier_id").eq("item_code", itemCode).single();
      expect(item.supplier_id).toBe(supplier.id);
      const { data: mappings } = await client.from("supplier_items").select("id,unit_cost,moq,lead_time_days").eq("item_id", item.id).eq("supplier_id", supplier.id).is("deleted_at", null);
      expect(mappings).toHaveLength(1);
      expect(mappings[0]).toMatchObject({ unit_cost: 2.5, moq: 3, lead_time_days: 2 });

      await page.goto("/imports/items", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Edit in table" }).click();
      await page.getByRole("button", { name: "Add blank row" }).click();
      const badInputs = page.locator("table tbody tr").first().locator("input");
      for (const [column, value] of Object.entries({ item_code: `${itemCode}-BAD`, item_name: "Rejected item", category: "QA", base_uom: "PCS", supplier_code: "UNKNOWN-QA75" })) {
        await badInputs.nth(headers.findIndex((header) => header.trim() === column) - 1).fill(value);
      }
      await page.getByRole("button", { name: "Proceed / Confirm Import" }).click();
      await expect(page.getByText(/Supplier code not found/i)).toBeVisible();
      const { count: rejectedCount } = await client.from("items").select("id", { count: "exact", head: true }).eq("item_code", `${itemCode}-BAD`);
      expect(rejectedCount).toBe(0);
    } finally {
      const { data: items } = await client.from("items").select("id").in("item_code", [itemCode, `${itemCode}-BAD`]);
      for (const item of items ?? []) {
        await client.from("supplier_items").delete().eq("item_id", item.id);
        await client.from("items").delete().eq("id", item.id);
      }
      await client.auth.signOut();
    }
  });
});
