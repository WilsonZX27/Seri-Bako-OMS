import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/migrations/186_fix_pr_to_po_conversion.sql", "utf8");
const handoffMigration = fs.readFileSync("supabase/migrations/220_finance_po_handoff_and_send_permission.sql", "utf8");
const recoveryMigration = fs.readFileSync("supabase/migrations/221_legacy_pr_po_reconciliation.sql", "utf8");
const orphanRecoveryMigration = fs.readFileSync("supabase/migrations/222_reuse_orphan_po_document.sql", "utf8");
const action = fs.readFileSync("src/server/actions/procurement.ts", "utf8");
const errorHandling = fs.readFileSync("src/server/actions/error-handling.ts", "utf8");
const detailPage = fs.readFileSync("src/app/(app)/purchase-requests/[id]/page.tsx", "utf8");
const errorNotice = fs.readFileSync("src/components/action-error-notice.tsx", "utf8");

test("PR to PO migration writes an idempotency key and preserves one active PO per PR", () => {
  assert.match(migration, /add column if not exists idempotency_key uuid/);
  assert.match(migration, /purchase_orders_idempotency_key_idx/);
  assert.match(migration, /purchase_request_id = request_row\.id/);
  assert.match(migration, /idempotency_key\r?\n\s*\) values/);
  assert.match(migration, /conversion_idempotency_key/);
  assert.match(migration, /return query select existing_order\.id/);
  assert.match(migration, /PO_NUMBER_ALREADY_USED/);
});

test("legacy PR to PO recovery preserves Purchasing's saved AutoCount number after an error", () => {
  assert.match(action, /submittedPoNo = cleanText\(formData\.get\("autocount_po_no"\)\)/);
  assert.match(action, /po_no=\$\{encodeURIComponent\(submittedPoNo\.slice\(0, 160\)\)\}/);
  assert.match(detailPage, /defaultValue=\{messageParams\.po_no \?\? request\.autocount_po_no \?\? ""\}/);
  assert.match(detailPage, /Legacy recovery only/);
  assert.match(detailPage, /ActionErrorNotice message=\{messageParams\.error\}/);
  assert.match(errorNotice, /autocount po number\|po number/);
  assert.match(action, /rpc\("finish_legacy_purchase_request_to_order"/);
  assert.doesNotMatch(action.slice(action.indexOf("export async function convertPurchaseRequestToPurchaseOrder")), /rpc\("set_purchase_request_autocount_po_no"/);
  assert.match(recoveryMigration, /existing_order\.purchase_request_id is not null/);
  assert.match(recoveryMigration, /existing_order\.branch_id is distinct from request_row\.branch_id/);
  assert.match(recoveryMigration, /existing_order\.supplier_id is distinct from selected_supplier_id/);
  assert.match(recoveryMigration, /legacy_pr_po_reconciliation/);
  assert.match(orphanRecoveryMigration, /existing_document\.document_type <> 'purchase_order'/);
  assert.match(orphanRecoveryMigration, /PO_DOCUMENT_OWNED_BY_ANOTHER_ORDER/);
  assert.match(orphanRecoveryMigration, /Recovered orphan purchase order document/);
  assert.match(orphanRecoveryMigration, /orphan_po_document_recovery/);
});

test("Finance approval creates the PO atomically from Purchasing's saved number", () => {
  assert.match(handoffMigration, /finance_approve_purchase_request_to_order/);
  assert.match(handoffMigration, /perform public\.transition_purchase_request\(request_row\.id, 'finance_approve', null\)/);
  assert.match(handoffMigration, /from public\.convert_purchase_request_to_purchase_order\(/);
  assert.match(handoffMigration, /request_row\.autocount_po_no/);
  assert.match(action, /rpc\("finance_approve_purchase_request_to_order"/);
  assert.match(action, /is ready to send/);
  assert.doesNotMatch(detailPage, /marks the request ready for PO conversion/);
});

test("PO send accepts both canonical permission codes for Purchasing", () => {
  assert.match(handoffMigration, /permission_code in \('po\.send', 'purchase_order\.send'\)/);
  assert.match(handoffMigration, /has_any_permission\(array\['po\.send','purchase_order\.send'\]\)/);
});

test("PR to PO conversion errors are actionable and do not expose database diagnostics", () => {
  for (const code of [
    "PO_NUMBER_REQUIRED",
    "PO_NUMBER_ALREADY_USED",
    "PO_NUMBER_LINKED_TO_ANOTHER_REQUEST",
    "PO_NUMBER_BELONGS_TO_DIFFERENT_ORDER",
    "PO_DOCUMENT_BELONGS_TO_DIFFERENT_RECORD",
    "PO_DOCUMENT_OWNED_BY_ANOTHER_ORDER",
    "PR_NOT_READY",
    "PR_HAS_NO_LINES",
    "PR_HAS_MULTIPLE_SUPPLIERS",
    "SUPPLIER_NOT_ACTIVE",
    "IDEMPOTENCY_MIGRATION_PENDING",
  ]) {
    assert.match(errorHandling, new RegExp(code, "i"));
  }
  assert.match(errorHandling, /database migration is pending/);
  assert.doesNotMatch(errorHandling, /return error\.message/);
});
