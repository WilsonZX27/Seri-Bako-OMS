const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migration = fs.readFileSync("supabase/migrations/094_stock_operation_creation_atomicity.sql", "utf8");
const actions = fs.readFileSync("src/server/actions/stock-operations.ts", "utf8");
const form = fs.readFileSync("src/components/stock-operation-forms.tsx", "utf8");

test("transfer and wastage drafts are database-owned aggregate transactions", () => {
  for (const rpc of ["create_stock_transfer_atomic", "create_stock_wastage_atomic"]) {
    assert.match(migration, new RegExp(`create or replace function public\\.${rpc}\\(p_payload jsonb\\)`));
    assert.match(migration, new RegExp(`grant execute on function public\\.${rpc}\\(jsonb\\) to authenticated`));
    assert.match(actions, new RegExp(`rpc\\("${rpc}"`));
  }
  assert.match(migration, /insert into public\.documents/);
  assert.match(migration, /insert into public\.document_revisions/);
  assert.match(migration, /insert into public\.activity_logs/);
  assert.match(migration, /idempotency_key/);
  assert.match(migration, /company_id=actor\.company_id/);
  assert.match(migration, /has_permission\('stock_transfer\.create'\)/);
  assert.match(migration, /has_permission\('stock_wastage\.create'\)/);
  assert.match(form, /name="idempotency_key"/);
  assert.doesNotMatch(actions, /function createDoc/);
});
