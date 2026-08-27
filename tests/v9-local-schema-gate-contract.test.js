const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const sql = fs.readFileSync("supabase/uat/verify_v9_schema.sql", "utf8");
const runner = fs.readFileSync("scripts/v9/verify-local-schema.mjs", "utf8");

test("v9 local schema gate validates migration, RLS, views and function safety", () => {
  assert.match(sql, /latest_migration <> '225'/);
  assert.match(sql, /sync_purchase_order_attachment_to_receivings/);
  assert.match(sql, /finish_legacy_purchase_request_to_order/);
  assert.match(sql, /not rowsecurity/);
  assert.match(sql, /SECURITY DEFINER functions without a fixed search_path/);
  assert.match(sql, /security_invoker=true/);
  assert.match(sql, /Unexpected RLS tables without a policy/);
  assert.match(sql, /V9_SCHEMA_OK/);
});

test("v9 local schema gate validates the canonical drift repairs and Stock Count terminal contract", () => {
  for (const value of ["audit_logs", "old_values", "attachments", "storage_path", "notifications", "recipient_staff_id", "void_stock_count_atomic", "voided"]) {
    assert.match(sql, new RegExp(value));
  }
});

test("v9 local schema gate verifies the Finance and Manager role-alignment migrations", () => {
  assert.match(sql, /Finance master-data read alignment is incomplete/);
  assert.match(sql, /Manager still has a Purchase Request authoring permission/);
  assert.match(sql, /Manager inventory read alignment is incomplete/);
});

test("v9 schema verification can only execute against the resolved local Docker database", () => {
  assert.match(runner, /localDatabaseContainer\(\)/);
  assert.match(runner, /assertLocalContainer\(container\)/);
  assert.match(runner, /docker/);
  assert.doesNotMatch(runner, /--linked|SUPABASE_DB_PASSWORD|project-ref/);
});

test("v9 local schema gate verifies Purchasing can remove unposted PR work", () => {
  assert.match(sql, /Purchasing unposted-PR cancellation permission is incomplete/);
});
