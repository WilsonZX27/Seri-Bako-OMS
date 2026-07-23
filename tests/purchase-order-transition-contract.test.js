const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migration = fs.readFileSync("supabase/migrations/086_purchase_order_transition_atomicity.sql", "utf8");
const action = fs.readFileSync("src/server/actions/procurement.ts", "utf8");

test("purchase order transition RPC locks the row and enforces the lifecycle matrix", () => {
  assert.match(migration, /where id = p_purchase_order_id and company_id = actor\.company_id[\s\S]*for update/);
  assert.match(migration, /po\.status <> 'draft'/);
  assert.match(migration, /po\.status <> 'pending_approval'/);
  assert.match(migration, /po\.status not in \('draft','pending_approval','approved','sent'\)/);
  assert.match(migration, /po\.status not in \('received','partial_received'\)/);
  assert.match(migration, /insert into public\.activity_logs/);
});

test("purchase order actions delegate status changes to the atomic RPC", () => {
  assert.match(action, /transition_purchase_order_atomic/);
  assert.doesNotMatch(action, /from\("purchase_orders"\)\.update\(\{ status, approval_status/);
});
