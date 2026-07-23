const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migration = fs.readFileSync("supabase/migrations/097_purchase_return_creation_atomicity.sql", "utf8");
const actions = fs.readFileSync("src/server/actions/purchase-returns.ts", "utf8");
const form = fs.readFileSync("src/components/purchase-return-form.tsx", "utf8");

test("purchase-return draft creation is locked, company-scoped, and retry-safe", () => {
  assert.match(migration, /create or replace function public\.create_purchase_return_atomic\(p_payload jsonb\)/);
  assert.match(migration, /has_permission\('purchase_return\.create'\)/);
  assert.match(migration, /from public\.goods_receivings/);
  assert.match(migration, /for update/);
  assert.match(migration, /can_access_inventory_branch\(grn\.company_id, grn\.branch_id\)/);
  assert.match(migration, /purchase_return_lines/);
  assert.match(migration, /document_revisions/);
  assert.match(migration, /activity_logs/);
  assert.match(migration, /idempotency_key/);
  assert.match(migration, /grant execute on function public\.create_purchase_return_atomic\(jsonb\) to authenticated/);
  assert.match(actions, /rpc\("create_purchase_return_atomic"/);
  assert.doesNotMatch(actions, /function createLinkedDocument/);
  assert.match(form, /name="idempotency_key"/);
});
