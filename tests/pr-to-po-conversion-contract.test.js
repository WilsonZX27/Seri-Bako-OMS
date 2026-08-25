import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/migrations/186_fix_pr_to_po_conversion.sql", "utf8");
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

test("PR to PO action preserves the typed AutoCount number after an error", () => {
  assert.match(action, /submittedPoNo = cleanText\(formData\.get\("autocount_po_no"\)\)/);
  assert.match(action, /po_no=\$\{encodeURIComponent\(submittedPoNo\.slice\(0, 160\)\)\}/);
  assert.match(detailPage, /defaultValue=\{messageParams\.po_no \?\? ""\}/);
  assert.match(detailPage, /ActionErrorNotice message=\{messageParams\.error\}/);
  assert.match(errorNotice, /autocount po number\|po number/);
});

test("PR to PO conversion errors are actionable and do not expose database diagnostics", () => {
  for (const code of [
    "PO_NUMBER_REQUIRED",
    "PO_NUMBER_ALREADY_USED",
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
