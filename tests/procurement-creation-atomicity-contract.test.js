import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/087_procurement_creation_atomicity.sql", "utf8");
const action = fs.readFileSync("src/server/actions/procurement.ts", "utf8");

test("procurement creation is transaction-shaped and retry-safe", () => {
  assert.match(migration, /create or replace function public\.create_purchase_request_atomic\(p_payload jsonb\)/);
  assert.match(migration, /create or replace function public\.create_purchase_order_atomic\(p_payload jsonb\)/);
  assert.match(migration, /idempotency_key uuid/);
  assert.match(migration, /for update/);
  assert.match(migration, /jsonb_to_recordset\(lines\)/);
  assert.match(migration, /document_revisions/);
  assert.match(migration, /activity_logs/);
  assert.match(action, /rpc\("create_purchase_request_atomic"/);
  assert.match(action, /rpc\("create_purchase_order_atomic"/);
  assert.doesNotMatch(action, /\.from\("purchase_orders"\)\s*\.insert\(/);
});
