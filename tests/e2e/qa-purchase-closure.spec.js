const fs = require("node:fs");
const { createClient } = require("@supabase/supabase-js");
const { test, expect } = require("@playwright/test");
const { login, logout } = require("./helpers");

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

test.describe("QA- procurement payment closure", () => {
  test.describe.configure({ mode: "serial" });
  let admin;
  let fixture;
  let created = {};

  test.beforeAll(async () => {
    loadEnv();
    admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const company = (await must(admin.from("companies").select("id").eq("status", "active").limit(1).single(), "company")).id;
    const branch = await must(admin.from("branches").select("id").eq("company_id", company).eq("status", "active").limit(1).single(), "branch");
    const owner = await must(admin.from("staffs").select("id").eq("email", process.env.TEST_SUPER_ADMIN_EMAIL).single(), "owner staff");
    const kitchen = await must(admin.from("staffs").select("id").eq("email", process.env.TEST_KITCHEN_EMAIL).single(), "kitchen staff");
    const sequenceRows = [];
    for (const [document_type, prefix] of [["purchase_request", "PR"], ["purchase_order", "PO"], ["goods_receiving", "GRN"], ["supplier_invoice", "INV"], ["payment_schedule", "PAY"]]) {
      const existing = await must(admin.from("document_sequences").select("id").eq("company_id", company).eq("document_type", document_type).is("deleted_at", null).limit(1), `sequence lookup ${document_type}`);
      if (!existing.length) {
        const row = await must(admin.from("document_sequences").insert({ company_id: company, document_type, prefix, next_number: 1, padding: 5, reset_frequency: "yearly", status: "active", created_by: owner.id, updated_by: owner.id }).select("id").single(), `sequence ${document_type}`);
        sequenceRows.push(row.id);
      }
    }
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const supplier = await must(admin.from("suppliers").insert({
      company_id: company,
      supplier_code: `QA-CLOSURE-SUP-${suffix}`,
      name: `QA-供应商-${suffix}-${"长名称".repeat(90)}-<>&`,
      payment_terms_days: 30,
      status: "active",
    }).select("id,supplier_code").single(), "supplier");
    const item = await must(admin.from("items").insert({
      company_id: company,
      item_code: `QA-CLOSURE-ITEM-${suffix}`,
      item_name: "QA-采购测试项目-中文/Malay & <safe>",
      category: "QA",
      purchase_unit: "KG",
      base_unit: "KG",
      conversion_to_base_unit: 1,
      cost: 12.34,
      safety_stock: 0,
      moq: 1,
      status: "active",
    }).select("id,item_code").single(), "item");
    const supplierItem = await must(admin.from("supplier_items").insert({
      company_id: company,
      supplier_id: supplier.id,
      item_id: item.id,
      supplier_item_code: `QA-SI-${suffix}`,
      supplier_item_name: item.item_code,
      purchase_uom: "KG",
      conversion_to_base_uom: 1,
      unit_cost: 12.34,
      moq: 1,
      lead_time_days: 1,
      status: "active",
      created_by: owner.id,
      updated_by: owner.id,
    }).select("id").single(), "supplier item");
    // Deliberately leave the branch route unconfigured. A PR supplier is a
    // required suggestion, not a setup blocker; Purchasing confirms or creates
    // the provisional route during review/PO confirmation.
    const opening = await must(admin.from("stock_transactions").insert({
      transaction_no: `QA-OPEN-${suffix}`,
      item_id: item.id,
      branch_id: branch.id,
      transaction_type: "opening_balance",
      transaction_date: new Date().toISOString().slice(0, 10),
      quantity_in: 100,
      quantity_out: 0,
      unit_cost: 12.34,
      total_cost: 1234,
      status: "posted",
      posted_at: new Date().toISOString(),
      posted_by: owner.id,
      created_by: owner.id,
      remarks: `QA fixture ${suffix}`,
      reference_type: "qa_fixture",
    }).select("id").single(), "opening stock");
    fixture = { company, branch: branch.id, owner: owner.id, kitchen: kitchen.id, supplier: supplier.id, item: item.id, itemCode: item.item_code, itemName: "QA-采购测试项目-中文/Malay & <safe>", supplierItem: supplierItem.id, opening: opening.id, sequenceRows, suffix };
  });

  test.afterAll(async () => {
    if (!admin || !fixture) return;
    if (created.invoiceId) {
      const invoice = await admin.from("supplier_invoices").select("document_id").eq("id", created.invoiceId).maybeSingle();
      await admin.from("supplier_invoice_payments").delete().eq("supplier_invoice_id", created.invoiceId);
      await admin.from("supplier_invoice_lines").delete().eq("supplier_invoice_id", created.invoiceId);
      await admin.from("supplier_invoices").delete().eq("id", created.invoiceId);
      if (invoice.data?.document_id) await admin.from("documents").delete().eq("id", invoice.data.document_id);
    }
    if (created.grnId) {
      const grn = await admin.from("goods_receivings").select("document_id").eq("id", created.grnId).maybeSingle();
      const movements = await admin.from("stock_transactions").select("id").eq("reference_id", created.grnId);
      const movementIds = (movements.data ?? []).map((row) => row.id);
      if (movementIds.length) await admin.from("stock_transaction_lines").delete().in("stock_transaction_id", movementIds);
      await admin.from("stock_transactions").delete().eq("reference_id", created.grnId);
      await admin.from("goods_receiving_lines").delete().eq("goods_receiving_id", created.grnId);
      await admin.from("goods_receivings").delete().eq("id", created.grnId);
      if (grn.data?.document_id) await admin.from("documents").delete().eq("id", grn.data.document_id);
    }
    if (created.poId) {
      const po = await admin.from("purchase_orders").select("document_id").eq("id", created.poId).maybeSingle();
      await admin.from("purchase_order_lines").delete().eq("purchase_order_id", created.poId);
      await admin.from("purchase_orders").delete().eq("id", created.poId);
      if (po.data?.document_id) await admin.from("documents").delete().eq("id", po.data.document_id);
    }
    if (created.prId) {
      const pr = await admin.from("purchase_requests").select("document_id").eq("id", created.prId).maybeSingle();
      await admin.from("purchase_request_lines").delete().eq("purchase_request_id", created.prId);
      await admin.from("purchase_requests").delete().eq("id", created.prId);
      if (pr.data?.document_id) await admin.from("documents").delete().eq("id", pr.data.document_id);
    }
    await admin.from("branch_supplier_items").delete().eq("item_id", fixture.item);
    await admin.from("supplier_items").delete().eq("id", fixture.supplierItem);
    await admin.from("stock_transactions").delete().eq("id", fixture.opening);
    await admin.from("items").delete().eq("id", fixture.item);
    await admin.from("suppliers").delete().eq("id", fixture.supplier);
    for (const id of fixture.sequenceRows ?? []) await admin.from("document_sequences").delete().eq("id", id);
  });

  test("kitchen creates and submits a QA PR to Manager Review", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, "kitchen");
    await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });
    // Supplier is a required request-level suggestion even when its branch
    // route is still provisional. The item itself remains searchable from the
    // Item Master and Purchasing confirms the route later.
    await page.locator('select[name="request_supplier_id"]').selectOption(fixture.supplier);
    const itemInput = page.locator('input[role="combobox"][placeholder*="Search any words in item name or code"]').first();
    await expect(itemInput).toBeVisible();
    await itemInput.fill(fixture.itemCode);
    // Exact code entry is intentionally accepted immediately by the combobox;
    // the dropdown is only needed for fuzzy matches and closes after selection.
    await expect(page.locator('input[name="line_item_id"]').first()).toHaveValue(fixture.item);
    await page.locator('input[name="line_qty"]').first().fill("2");
    await page.locator('select[name="line_uom"]').first().selectOption("KG");
    const submitPr = page.locator('[data-mobile-document-action] button[type="submit"][name="intent"][value="submit"]');
    // The mobile action rail intentionally yields while an editable control
    // owns focus; blur the UOM control before asserting the rail is visible.
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
    await expect(submitPr).toBeVisible();
    await expect(submitPr).toBeEnabled();
    await submitPr.click();
    await page.waitForURL(/\/purchase-requests\/[0-9a-f-]+/i, { timeout: 30_000, waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText(/Manager Review/i);
    created.prUrl = page.url();
    created.prId = new URL(page.url()).pathname.split("/").pop();
  });

  test("Manager, Purchasing, and Finance complete PR review gates", async ({ page }) => {
    test.skip(!created.prId, "PR was not created");
    async function confirm(label) {
      await page.getByRole("button", { name: new RegExp(label, "i") }).first().click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: new RegExp(label, "i") }).click();
      await page.waitForLoadState("domcontentloaded");
    }
    async function status() {
      return (await must(admin.from("purchase_requests").select("status").eq("id", created.prId).single(), "PR status")).status;
    }
    await logout(page);
    await login(page, "manager");
    await page.goto(created.prUrl, { waitUntil: "domcontentloaded" });
    await confirm("Approve as Manager");
    await expect.poll(status).toBe("admin_review");

    await logout(page);
    await login(page, "purchasing");
    await page.goto(created.prUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Approve as Purchasing/i }).first()).toBeVisible();
    await confirm("Approve as Purchasing");
    await expect.poll(status).toBe("finance_review");

    await logout(page);
    await login(page, "finance");
    await page.goto(created.prUrl, { waitUntil: "domcontentloaded" });
    await confirm("Approve as Finance");
    await expect.poll(status).toBe("ready_to_convert");
  });

  test("QA verifies PO conversion prerequisites and supplier-send controls", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!created.prId, "PR was not created");
    const browser = page.context().browser();
    await logout(page);
    await login(page, "superAdmin");
    await page.goto(created.prUrl, { waitUntil: "domcontentloaded" });
    const convertForm = page.locator('form:visible').filter({ has: page.locator('input[name="autocount_po_no"]') }).first();
    await expect(convertForm).toBeVisible();
    await convertForm.locator('input[name="autocount_po_no"]').fill(`QA-AUTOCOUNT-${fixture.suffix}-超长编号-中文`);
    await convertForm.getByRole("button", { name: /Convert to Purchase Order/i }).click();
    await page.waitForURL(/\/purchase-orders\/[0-9a-f-]+/i, { timeout: 30_000, waitUntil: "domcontentloaded" });
    created.poUrl = page.url();
    created.poId = new URL(page.url()).pathname.split("/").pop();
    await expect(page.locator("body")).toContainText(/AutoCount PO Number/i);
    await expect(page.getByRole("button", { name: /Send to supplier/i }).first()).toBeVisible();

    async function upload(label, name) {
      const uploadForm = page.locator('form:has(input[type="file"]):visible').first();
      await uploadForm.locator('input[name="file_name"]').fill(label);
      await uploadForm.locator('input[type="file"]').setInputFiles({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 QA fixture") });
      await uploadForm.getByRole("button", { name: /Upload attachment|Attach /i }).click();
      try {
        await expect(page.locator("body")).toContainText(new RegExp(`${label} uploaded`, "i"), { timeout: 15_000 });
      } catch (error) {
        // Next dev can fail to hydrate the refreshed RSC tree after storage
        // upload even though the server action committed the attachment.
        const persisted = await admin.from("attachments").select("id").eq("file_name", label).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (!persisted.data?.id) throw error;
      }
    }

    await upload("Purchase Order", `QA-PO-${fixture.suffix}.pdf`);
    await page.getByRole("button", { name: /Send to supplier/i }).first().click();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toContainText(/Sent to Supplier|Sent/i);

    await logout(page);
    await login(page, "kitchen");
    await page.goto(`/goods-receivings/new?po_id=${created.poId}`, { waitUntil: "domcontentloaded" });
    const receivingSetupToggle = page.locator('button[aria-controls="goods-receiving-setup-fields"]');
    const deliveryOrderInput = page.locator('input[name="delivery_order_no"]:not([type="hidden"])');
    await expect(receivingSetupToggle).toBeVisible();
    if (await page.locator('input[name="delivery_order_no"]:not([type="hidden"])').count() === 0) await receivingSetupToggle.click();
    await expect(deliveryOrderInput).toBeVisible();
    await deliveryOrderInput.fill(`QA-DO-${fixture.suffix}-中文`);
    await page.locator('input[name="line_received_qty"]').first().fill("2");
    await page.getByRole("button", { name: /Save receiving draft/i }).first().click();
    await page.waitForURL(/\/goods-receivings\/[0-9a-f-]+/i, { timeout: 30_000 });
    created.grnUrl = page.url();
    created.grnId = new URL(page.url()).pathname.split("/").pop();
    await upload("Delivery Order", `QA-DO-${fixture.suffix}.pdf`);
    await expect(page.getByRole("button", { name: /Post Receiving to Stock/i }).first()).toBeVisible();

    await logout(page);
    await login(page, "superAdmin");
    await page.goto(created.grnUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Post Receiving to Stock/i }).first().click();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toContainText(/Posted/i);

    await logout(page);
    await login(page, "finance");
    await page.goto(`/supplier-invoices/new?supplier_id=${fixture.supplier}`, { waitUntil: "domcontentloaded" });
    await page.locator('input[type="checkbox"][aria-label^="Select QA-采购测试项目"]:visible').first().check();
    await expect.poll(() => page.locator('input[name="lines"]').first().inputValue(), { timeout: 10_000 }).not.toBe("[]");
    await page.locator('input[name="supplier_invoice_no"]').fill(`QA-INVOICE-${fixture.suffix}-中文`);
    await page.getByRole("button", { name: /Save Invoice Details/i }).first().click();
    // The server action can finish with a 303 while the dev server keeps the
    // current RSC document; resolve the created QA invoice explicitly, then
    // continue in the real browser at its detail route.
    await expect.poll(async () => {
      const row = await admin.from("supplier_invoices").select("id,supplier_invoice_no").eq("supplier_id", fixture.supplier).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return row.data?.supplier_invoice_no === `QA-INVOICE-${fixture.suffix}-中文` ? row.data.id : null;
    }, { timeout: 30_000 }).not.toBeNull();
    const createdInvoice = await admin.from("supplier_invoices").select("id").eq("supplier_id", fixture.supplier).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!createdInvoice.data?.id) throw new Error("QA invoice was not created");
    created.invoiceId = createdInvoice.data.id;
    created.invoiceUrl = `${new URL(page.url()).origin}/supplier-invoices/${created.invoiceId}`;
    // Keep attachment refreshes in an isolated context. Next dev can dispose
    // the page that just rendered an RSC mutation response; the finance UAT
    // should start from a fresh authenticated page rather than inheriting that
    // transient document state.
    const invoiceUploadContext = await browser.newContext();
    const invoiceUploadPage = await invoiceUploadContext.newPage();
    await login(invoiceUploadPage, "superAdmin");
    await invoiceUploadPage.goto(created.invoiceUrl, { waitUntil: "domcontentloaded" });
    const invoiceUploadForm = invoiceUploadPage.locator('form:has(input[type="file"]):visible').first();
    const supplierInvoiceAttachmentLabel = `Supplier Invoice ${fixture.suffix}`;
    await invoiceUploadForm.locator('input[name="file_name"]').fill(supplierInvoiceAttachmentLabel);
    await invoiceUploadForm.locator('input[type="file"]').setInputFiles({ name: `QA-INVOICE-${fixture.suffix}.pdf`, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 QA fixture") });
    await invoiceUploadForm.getByRole("button", { name: /Upload attachment|Attach /i }).click();
    await expect.poll(async () => (await admin.from("attachments").select("id").eq("file_name", supplierInvoiceAttachmentLabel).order("created_at", { ascending: false }).limit(1).maybeSingle()).data?.id ?? null, { timeout: 30_000 }).not.toBeNull();
    await invoiceUploadContext.close().catch(() => {});
    const financeContext = await browser.newContext();
    const financePage = await financeContext.newPage();
    await login(financePage, "finance");
    await financePage.goto(created.invoiceUrl, { waitUntil: "domcontentloaded" });
    await financePage.getByRole("button", { name: /Approve as Finance/i }).first().click();
    const dialog = financePage.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /Approve as Finance/i }).click();
    await financePage.waitForLoadState("domcontentloaded");
    await expect.poll(async () => {
      const row = await admin.from("supplier_invoices").select("status").eq("id", created.invoiceId).maybeSingle();
      return row.data?.status ?? "";
    }, { timeout: 30_000 }).toBe("open");
    await financePage.goto(`/supplier-invoices/aging?status=open&search=${encodeURIComponent(`QA-INVOICE-${fixture.suffix}-中文`)}`, { waitUntil: "domcontentloaded" });
    await expect(financePage.locator("body")).toContainText(`QA-INVOICE-${fixture.suffix}-中文`);
    await financeContext.close().catch(() => {});
    // Isolate the post-approval upload/payment interaction from the page that
    // just rendered the RSC approval response; Next dev may dispose that page
    // while refreshing attachment data.
    const paymentContext = await browser.newContext();
    const paymentPage = await paymentContext.newPage();
    await login(paymentPage, "finance");
    await paymentPage.goto(created.invoiceUrl, { waitUntil: "domcontentloaded" });
    async function uploadPayment() {
      const form = paymentPage.locator('form:has(input[type="file"]):visible').filter({ hasText: "Attach Payment Slip" }).first();
      await form.locator('input[name="file_name"]').fill("Payment Slip");
      await form.locator('input[type="file"]').setInputFiles({ name: `QA-PAYMENT-SLIP-${fixture.suffix}.pdf`, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 QA fixture") });
      await form.getByRole("button", { name: /Attach Payment Slip|Upload attachment/i }).click();
      await expect.poll(async () => (await admin.from("attachments").select("id").eq("file_name", "Payment Slip").order("created_at", { ascending: false }).limit(1).maybeSingle()).data?.id ?? null, { timeout: 30_000 }).not.toBeNull();
    }
    await uploadPayment();
    await paymentPage.goto(created.invoiceUrl, { waitUntil: "domcontentloaded" }).catch(() => {});
    await paymentPage.locator('input[name="amount"]:visible').first().fill("24.68");
    await paymentPage.locator('input[name="payment_method"]:visible').first().fill("QA Bank Transfer");
    await paymentPage.locator('input[name="reference_no"]:visible').first().fill(`QA-PAY-${fixture.suffix}`);
    await paymentPage.getByRole("button", { name: /Record Payment/i }).first().click();
    await expect.poll(async () => (await admin.from("supplier_invoices").select("status").eq("id", created.invoiceId).maybeSingle()).data?.status ?? "", { timeout: 30_000 }).toBe("paid");
    await paymentContext.close();

    const closeContext = await browser.newContext();
    const closePage = await closeContext.newPage();
    await login(closePage, "purchasing");
    await closePage.goto(created.poUrl, { waitUntil: "commit", timeout: 30_000 });
    const moreOptions = closePage.getByText("More options", { exact: true });
    for (let index = 0; index < await moreOptions.count(); index += 1) {
      const candidate = moreOptions.nth(index);
      if (await candidate.isVisible()) {
        await candidate.click();
        break;
      }
    }
    await expect(closePage.getByRole("button", { name: /Close purchase order/i }).first()).toBeVisible({ timeout: 30_000 });
    await closePage.getByRole("button", { name: /Close purchase order/i }).first().click();
    await closePage.waitForLoadState("domcontentloaded");
    await expect(closePage.locator("body")).toContainText(/Closed/i);
    await closeContext.close();
  });
});
