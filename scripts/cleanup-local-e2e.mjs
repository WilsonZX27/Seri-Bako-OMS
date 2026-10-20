import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envFile = process.env.TEST_ENV_FILE || ".env.test.local";
const parseEnv = (text) => Object.fromEntries(
  text.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
  }),
);

if (!fs.existsSync(envFile)) throw new Error(`Missing ${envFile}`);
const env = parseEnv(fs.readFileSync(envFile, "utf8"));
const localUrl = env.NEXT_PUBLIC_SUPABASE_URL;
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(localUrl || "")) {
  throw new Error(`Refusing cleanup: target is not local (${localUrl || "missing URL"}).`);
}
if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");

const admin = createClient(localUrl, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const counts = new Map();
const note = (label, count) => counts.set(label, (counts.get(label) || 0) + (count || 0));

async function select(table, columns, configure) {
  let query = admin.from(table).select(columns);
  query = configure(query);
  const result = await query;
  if (result.error) throw new Error(`${table} select failed: ${result.error.message}`);
  return result.data || [];
}

async function remove(table, configure, label = table) {
  let query = admin.from(table).delete({ count: "exact" });
  query = configure(query);
  const result = await query;
  if (result.error) throw new Error(`${table} cleanup failed: ${result.error.message}`);
  note(label, result.count || 0);
}

const annotationRequestIds = [
  "e2000000-0000-4000-8000-000000000001",
  "e2000000-0000-4000-8000-000000000021",
  "e2000000-0000-4000-8000-000000000022",
  "e2000000-0000-4000-8000-000000000023",
  "e2000000-0000-4000-8000-000000000030",
  "e2000000-0000-4000-8000-000000000031",
  "e2000000-0000-4000-8000-000000000032",
  "e1000000-0000-4000-8000-000000000001",
];
const annotationDocumentIds = [
  "e2000000-0000-4000-8000-000000000002",
  "e2000000-0000-4000-8000-000000000008",
  "e1000000-0000-4000-8000-000000000002",
];
const outletRecordIds = [
  "e2000000-0000-4000-8000-000000000005",
  "e2000000-0000-4000-8000-000000000010",
  "e2000000-0000-4000-8000-000000000012",
];
const outletRecordLineIds = [
  "e2000000-0000-4000-8000-000000000006",
  "e2000000-0000-4000-8000-000000000011",
  "e2000000-0000-4000-8000-000000000013",
];

const fixtureRequestRows = await select("purchase_requests", "id, document_id", (q) => q.like("request_no", "E2E-%"));
const fixtureRequestIds = [...new Set([...annotationRequestIds, ...fixtureRequestRows.map((row) => row.id)])];
const fixtureDocumentIds = [...new Set([...annotationDocumentIds, ...fixtureRequestRows.map((row) => row.document_id).filter(Boolean)])];

const invoicePo = (await select("purchase_orders", "id", (q) => q.eq("po_no", "E2E-PO-INVOICE-OPEN").limit(1)))[0];
const invoiceGrn = (await select("goods_receivings", "id", (q) => q.eq("grn_no", "E2E-GRN-INVOICE-OPEN").limit(1)))[0];
const invoiceReturnRows = invoiceGrn
  ? await select("purchase_returns", "id, document_id", (q) => q.eq("goods_receiving_id", invoiceGrn.id))
  : [];
const invoiceReturnIds = invoiceReturnRows.map((row) => row.id);
const invoiceReturnDocumentIds = invoiceReturnRows.map((row) => row.document_id).filter(Boolean);

if (invoiceReturnIds.length) {
  const movementRows = await select("stock_transactions", "id", (q) => q.eq("reference_type", "purchase_return").in("reference_id", invoiceReturnIds));
  const movementIds = movementRows.map((row) => row.id);
  if (movementIds.length) await remove("stock_transaction_lines", (q) => q.in("stock_transaction_id", movementIds));
  await remove("stock_transactions", (q) => q.in("id", movementIds));
  await remove("purchase_return_lines", (q) => q.in("purchase_return_id", invoiceReturnIds));
  await remove("purchase_returns", (q) => q.in("id", invoiceReturnIds));
  if (invoiceReturnDocumentIds.length) await remove("documents", (q) => q.in("id", invoiceReturnDocumentIds));
}

if (invoicePo) {
  const invoiceRows = await select("supplier_invoices", "id", (q) => q.eq("purchase_order_id", invoicePo.id));
  const invoiceIds = invoiceRows.map((row) => row.id);
  if (invoiceIds.length) {
    await remove("supplier_invoice_payments", (q) => q.in("supplier_invoice_id", invoiceIds));
    await remove("supplier_invoice_lines", (q) => q.in("supplier_invoice_id", invoiceIds));
    await remove("supplier_invoices", (q) => q.in("id", invoiceIds));
  }
}

if (invoiceGrn) {
  const grnUnlock = await admin.from("goods_receivings").update({ status: "draft", posted_at: null }).eq("id", invoiceGrn.id);
  if (grnUnlock.error) throw new Error(`goods_receivings unlock failed: ${grnUnlock.error.message}`);
  await remove("goods_receiving_lines", (q) => q.eq("goods_receiving_id", invoiceGrn.id));
  await remove("goods_receivings", (q) => q.eq("id", invoiceGrn.id));
}
if (invoicePo) {
  const poUnlock = await admin.from("purchase_orders").update({ status: "draft", approval_status: "draft" }).eq("id", invoicePo.id);
  if (poUnlock.error) throw new Error(`purchase_orders unlock failed: ${poUnlock.error.message}`);
  await remove("purchase_order_lines", (q) => q.eq("purchase_order_id", invoicePo.id));
  await remove("purchase_orders", (q) => q.eq("id", invoicePo.id));
}
const fixtureMovementRows = await select("stock_transactions", "id", (query) => query.eq("reference_type", "e2e_fixture"));
const fixtureMovementIds = fixtureMovementRows.map((row) => row.id);
if (fixtureMovementIds.length) {
  const receiptLineRows = await select("stock_transfer_receipt_lines", "id, receipt_id, stock_transfer_line_id", (query) => query.or(`source_transaction_id.in.(${fixtureMovementIds.join(",")}),destination_transaction_id.in.(${fixtureMovementIds.join(",")})`));
  const receiptIds = [...new Set(receiptLineRows.map((row) => row.receipt_id))];
  const transferLineIds = [...new Set(receiptLineRows.map((row) => row.stock_transfer_line_id))];
  if (receiptLineRows.length) await remove("stock_transfer_receipt_lines", (q) => q.in("id", receiptLineRows.map((row) => row.id)));
  if (receiptIds.length) await remove("stock_transfer_receipts", (q) => q.in("id", receiptIds));
  if (transferLineIds.length) {
    await remove("stock_transfer_reservations", (q) => q.in("stock_transfer_line_id", transferLineIds));
    await remove("stock_transfer_lines", (q) => q.in("id", transferLineIds));
  }
  await remove("stock_transaction_lines", (q) => q.in("stock_transaction_id", fixtureMovementIds));
}
await remove("stock_transactions", (q) => q.eq("reference_type", "e2e_fixture"));
await remove("activity_logs", (q) => q.eq("metadata->>fixture", "annotation"));
await remove("document_comments", (q) => q.in("document_id", fixtureDocumentIds));
await remove("purchase_request_lines", (q) => q.in("purchase_request_id", fixtureRequestIds));
const unlinkFixtureRequests = await admin.from("purchase_requests").update({ document_id: null }).in("id", fixtureRequestIds);
if (unlinkFixtureRequests.error) throw new Error(`purchase_requests unlink failed: ${unlinkFixtureRequests.error.message}`);
await remove("purchase_requests", (q) => q.in("id", fixtureRequestIds));
await remove("documents", (q) => q.in("id", fixtureDocumentIds));
await remove("outlet_daily_record_lines", (q) => q.in("id", outletRecordLineIds));
await remove("outlet_daily_records", (q) => q.in("id", outletRecordIds));

const fixtureSupplierItemRows = await select("supplier_items", "id", (query) => query.like("supplier_item_code", "E2E-%"));
const fixtureSupplierItemIds = fixtureSupplierItemRows.map((row) => row.id);
if (fixtureSupplierItemIds.length) await remove("branch_supplier_items", (q) => q.in("supplier_item_id", fixtureSupplierItemIds));
await remove("supplier_items", (q) => q.like("supplier_item_code", "E2E-%"));
await remove("suppliers", (q) => q.in("supplier_code", ["E2E-PR-SUP", "E2E-SOURCE-A", "E2E-SOURCE-B", "E2E-INV-SUP"]));
const fixtureItemRows = await select("items", "id", (query) => query.like("item_code", "E2E-%"));
const fixtureItemIds = fixtureItemRows.map((row) => row.id);
if (fixtureItemIds.length) {
  const transferLineRows = await select("stock_transfer_lines", "id, stock_transfer_id", (query) => query.in("item_id", fixtureItemIds));
  const transferLineIds = transferLineRows.map((row) => row.id);
  const transferIds = [...new Set(transferLineRows.map((row) => row.stock_transfer_id))];
  if (transferLineIds.length) await remove("stock_transfer_reservations", (q) => q.in("stock_transfer_line_id", transferLineIds));
  if (transferLineIds.length) await remove("stock_transfer_receipt_lines", (q) => q.in("stock_transfer_line_id", transferLineIds));
  if (transferLineIds.length) await remove("stock_transfer_lines", (q) => q.in("id", transferLineIds));
  if (transferIds.length) await remove("stock_transfers", (q) => q.in("id", transferIds));
  const wastageLineRows = await select("stock_wastage_lines", "id, stock_wastage_id", (query) => query.in("item_id", fixtureItemIds));
  const wastageLineIds = wastageLineRows.map((row) => row.id);
  const wastageIds = [...new Set(wastageLineRows.map((row) => row.stock_wastage_id))];
  if (wastageLineIds.length) await remove("stock_wastage_lines", (q) => q.in("id", wastageLineIds));
  if (wastageIds.length) await remove("stock_wastage", (q) => q.in("id", wastageIds));
  const stockCountLineRows = await select("stock_count_lines", "id, stock_count_id", (query) => query.in("item_id", fixtureItemIds));
  const stockCountIds = [...new Set(stockCountLineRows.map((row) => row.stock_count_id))];
  if (stockCountLineRows.length) await remove("stock_count_lines", (q) => q.in("id", stockCountLineRows.map((row) => row.id)));
  if (stockCountIds.length) await remove("stock_counts", (q) => q.in("id", stockCountIds));
  const itemMovementRows = await select("stock_transactions", "id", (query) => query.in("item_id", fixtureItemIds));
  const itemMovementIds = itemMovementRows.map((row) => row.id);
  if (itemMovementIds.length) {
    const receiptLineRows = await select("stock_transfer_receipt_lines", "id, receipt_id, stock_transfer_line_id", (query) => query.or(`source_transaction_id.in.(${itemMovementIds.join(",")}),destination_transaction_id.in.(${itemMovementIds.join(",")})`));
    const receiptIds = [...new Set(receiptLineRows.map((row) => row.receipt_id))];
    const transferLineIds = [...new Set(receiptLineRows.map((row) => row.stock_transfer_line_id))];
    if (receiptLineRows.length) await remove("stock_transfer_receipt_lines", (q) => q.in("id", receiptLineRows.map((row) => row.id)));
    if (receiptIds.length) await remove("stock_transfer_receipts", (q) => q.in("id", receiptIds));
    if (transferLineIds.length) {
      await remove("stock_transfer_reservations", (q) => q.in("stock_transfer_line_id", transferLineIds));
      await remove("stock_transfer_lines", (q) => q.in("id", transferLineIds));
    }
    await remove("stock_transaction_lines", (q) => q.in("stock_transaction_id", itemMovementIds));
    await remove("stock_transactions", (q) => q.in("id", itemMovementIds));
  }
}
await remove("items", (q) => q.like("item_code", "E2E-%"));
await remove("products", (q) => q.eq("product_code", "E2E-OUTLET-001"));
const fixtureBranchRows = await select("branches", "id", (query) => query.in("branch_code", ["E2E-OUTLET", "E2E-DST"]));
const fixtureBranchIds = fixtureBranchRows.map((row) => row.id);
if (fixtureBranchIds.length) {
  const branchTransferRows = await select("stock_transfers", "id, document_id", (query) => query.or(`from_branch_id.in.(${fixtureBranchIds.join(",")}),to_branch_id.in.(${fixtureBranchIds.join(",")})`));
  const branchTransferIds = branchTransferRows.map((row) => row.id);
  const branchTransferDocumentIds = branchTransferRows.map((row) => row.document_id).filter(Boolean);
  if (branchTransferIds.length) {
    const branchReceiptRows = await select("stock_transfer_receipts", "id", (query) => query.in("stock_transfer_id", branchTransferIds));
    const branchReceiptIds = branchReceiptRows.map((row) => row.id);
    if (branchReceiptIds.length) await remove("stock_transfer_receipt_lines", (q) => q.in("receipt_id", branchReceiptIds));
    if (branchReceiptIds.length) await remove("stock_transfer_receipts", (q) => q.in("id", branchReceiptIds));
    const branchTransferLineRows = await select("stock_transfer_lines", "id", (query) => query.in("stock_transfer_id", branchTransferIds));
    const branchTransferLineIds = branchTransferLineRows.map((row) => row.id);
    if (branchTransferLineIds.length) await remove("stock_transfer_reservations", (q) => q.in("stock_transfer_line_id", branchTransferLineIds));
    if (branchTransferLineIds.length) await remove("stock_transfer_lines", (q) => q.in("id", branchTransferLineIds));
    await remove("stock_transfers", (q) => q.in("id", branchTransferIds));
    if (branchTransferDocumentIds.length) await remove("documents", (q) => q.in("id", branchTransferDocumentIds));
  }
  const branchWastageRows = await select("stock_wastage", "id, document_id", (query) => query.in("branch_id", fixtureBranchIds));
  const branchWastageIds = branchWastageRows.map((row) => row.id);
  const branchWastageDocumentIds = branchWastageRows.map((row) => row.document_id).filter(Boolean);
  if (branchWastageIds.length) await remove("stock_wastage_lines", (q) => q.in("stock_wastage_id", branchWastageIds));
  if (branchWastageIds.length) await remove("stock_wastage", (q) => q.in("id", branchWastageIds));
  if (branchWastageDocumentIds.length) await remove("documents", (q) => q.in("id", branchWastageDocumentIds));
  const branchCountRows = await select("stock_counts", "id, document_id", (query) => query.in("branch_id", fixtureBranchIds));
  const branchCountIds = branchCountRows.map((row) => row.id);
  const branchCountDocumentIds = branchCountRows.map((row) => row.document_id).filter(Boolean);
  if (branchCountIds.length) await remove("stock_count_lines", (q) => q.in("stock_count_id", branchCountIds));
  if (branchCountIds.length) await remove("stock_counts", (q) => q.in("id", branchCountIds));
  if (branchCountDocumentIds.length) await remove("documents", (q) => q.in("id", branchCountDocumentIds));
  const branchMovementRows = await select("stock_transactions", "id", (query) => query.in("branch_id", fixtureBranchIds));
  const branchMovementIds = branchMovementRows.map((row) => row.id);
  if (branchMovementIds.length) await remove("stock_transaction_lines", (q) => q.in("stock_transaction_id", branchMovementIds));
  if (branchMovementIds.length) await remove("stock_transactions", (q) => q.in("id", branchMovementIds));
}
await remove("branches", (q) => q.in("id", fixtureBranchIds));

const emails = ["TEST_SUPER_ADMIN_EMAIL", "TEST_PEOPLE_OPERATIONS_EMAIL", "TEST_FINANCE_EMAIL", "TEST_MANAGER_EMAIL", "TEST_PURCHASING_EMAIL", "TEST_CHEF_EMAIL", "TEST_KITCHEN_EMAIL", "TEST_OUTLET_SUPERVISOR_EMAIL", "TEST_OUTLET_EMAIL"]
  .map((key) => env[key]?.toLowerCase())
  .filter(Boolean);
const authUsers = (await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users.filter((user) => emails.includes(user.email?.toLowerCase()));
const authIds = authUsers.map((user) => user.id);
if (authIds.length) {
  const staffRows = await select("staffs", "id", (q) => q.in("auth_user_id", authIds));
  const staffIds = staffRows.map((row) => row.id);
  if (staffIds.length) {
    await remove("document_line_revisions", (q) => q.or(`requested_by.in.(${staffIds.join(",")}),reviewed_by.in.(${staffIds.join(",")})`));
    await remove("document_revisions", (q) => q.in("changed_by", staffIds));
    await remove("activity_logs", (q) => q.in("created_by", staffIds));
    await remove("staff_roles", (q) => q.in("staff_id", staffIds));
    await remove("staff_branches", (q) => q.in("staff_id", staffIds));
    await remove("staff_permission_overrides", (q) => q.in("staff_id", staffIds));
    await remove("staffs", (q) => q.in("id", staffIds));
  }
  for (const user of authUsers) {
    const result = await admin.auth.admin.deleteUser(user.id);
    if (result.error) throw new Error(`auth cleanup failed: ${result.error.message}`);
    note("auth users", 1);
  }
}

console.log("Local E2E cleanup completed. Removed counts:");
for (const [label, count] of counts) console.log(`- ${label}: ${count}`);
