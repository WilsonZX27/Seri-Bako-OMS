import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/migrations/187_fix_purchase_order_transition_document_status.sql", "utf8");

test("PO submit uses the valid pending_approval document status", () => {
  assert.match(migration, /document_status := 'pending_approval'/);
  assert.doesNotMatch(migration, /document_status := 'pending';/);
  assert.match(migration, /transition_purchase_order_atomic/);
  assert.match(migration, /grant execute on function public\.transition_purchase_order_atomic/);
});
