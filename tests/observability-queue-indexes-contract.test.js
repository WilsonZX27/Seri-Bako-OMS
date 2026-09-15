const fs = require("node:fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const migration = fs.readFileSync("supabase/migrations/291_observability_queue_indexes.sql", "utf8");

test("observed operational queues use indexes matching their filters and newest-first order", () => {
  assert.match(migration, /documents \(approval_status, updated_at desc\)/);
  assert.match(migration, /purchase_requests \(status, updated_at desc\)[\s\S]*where deleted_at is null/);
  assert.match(migration, /notifications \(created_at desc\)/);
  assert.doesNotMatch(migration, /drop|alter policy|create or replace function/i);
});
