const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migration = fs.readFileSync("supabase/migrations/095_goods_receiving_creation_atomicity.sql", "utf8");
const action = fs.readFileSync("src/server/actions/goods-receivings.ts", "utf8");
const form = fs.readFileSync("src/components/goods-receiving-form.tsx", "utf8");

test("GRN draft creation is an idempotent, company-scoped database aggregate", () => {
  assert.match(migration, /create or replace function public\.create_goods_receiving_atomic\(p_payload jsonb\)/);
  assert.match(migration, /purchase_orders where id=purchase_order_id and company_id=actor\.company_id.*for update/s);
  assert.match(migration, /has_permission\('goods_receiving\.create'\)/);
  assert.match(migration, /can_access_inventory_branch\(actor\.company_id,branch_id\)/);
  assert.match(migration, /insert into public\.documents/);
  assert.match(migration, /insert into public\.goods_receiving_lines/);
  assert.match(migration, /insert into public\.document_revisions/);
  assert.match(migration, /insert into public\.activity_logs/);
  assert.match(migration, /idempotency_key/);
  assert.match(migration, /grant execute on function public\.create_goods_receiving_atomic\(jsonb\) to authenticated/);
  assert.match(action, /rpc\("create_goods_receiving_atomic"/);
  assert.doesNotMatch(action, /function createLinkedDocument/);
  assert.match(form, /name="idempotency_key"/);
});
