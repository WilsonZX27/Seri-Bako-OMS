import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("security remediation migration enforces inventory ownership and workflow invariants", () => {
  const sql = read("supabase/migrations/104_security_remediation_invariants.sql");
  for (const marker of [
    "enforce_stock_transfer_branch_scope",
    "enforce_stock_transaction_line_item_scope",
    "enforce_production_output_item_scope",
    "recalculate_production_stock_available",
    "enforce_purchase_order_idempotency",
    "enforce_supplier_invoice_approval_invariants",
    "enforce_purchase_order_close_invariants",
  ]) assert.match(sql, new RegExp(marker));
  assert.match(sql, /can_access_inventory_branch\(expected_company, expected_branch\)/);
  assert.match(sql, /i\.company_id = expected_company/);
});

test("server forms preserve complete stock counts and retry-safe purchase orders", () => {
  const countForm = read("src/components/stock-count-form.tsx");
  const countAction = read("src/server/actions/stock-counts.ts");
  const poForm = read("src/components/procurement-forms.tsx");
  const poAction = read("src/server/actions/procurement.ts");
  assert.match(countForm, /lines\.filter\(\(line\) => !visibleLines\.some/);
  assert.match(countAction, /All items for the selected branch must be included/);
  assert.match(poForm, /name="idempotency_key"/);
  assert.match(poAction, /z\.uuid\(\)\.parse\(cleanText\(formData\.get\("idempotency_key"\)\)\)/);
  assert.match(poAction, /idempotency_key: idempotencyKey/);
});
