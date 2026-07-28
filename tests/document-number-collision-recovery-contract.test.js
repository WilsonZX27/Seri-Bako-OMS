const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const migration = fs.readFileSync("supabase/migrations/107_document_number_collision_recovery.sql", "utf8");

test("document number allocation skips legacy ledger and document collisions", () => {
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /from public\.documents[\s\S]*document_no = v_candidate/);
  assert.match(migration, /from public\.stock_transactions[\s\S]*transaction_no = v_candidate/);
  assert.match(migration, /loop[\s\S]*v_attempt > 10000[\s\S]*exit when not exists/);
});

test("collision recovery keeps the tenant and permission checks from the hardened allocator", () => {
  assert.match(migration, /actor\.company_id is distinct from p_company_id/);
  assert.match(migration, /has_any_permission/);
  assert.match(migration, /set search_path = pg_catalog, public/);
});
