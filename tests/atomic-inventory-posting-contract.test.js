const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("atomic inventory migration exposes locked, permission-gated posting RPCs", () => {
  const migration = read("supabase/migrations/084_atomic_inventory_posting_core.sql");
  for (const fn of [
    "post_manual_inventory_movement",
    "dispatch_stock_transfer_atomic",
    "post_stock_transfer_atomic",
    "post_stock_wastage_atomic",
    "post_production_job_atomic",
  ]) assert.match(migration, new RegExp(`create or replace function public\\.${fn}`));
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /for update/);
  assert.match(migration, /grant execute on function public\.dispatch_stock_transfer_atomic/);
  assert.match(migration, /grant execute on function public\.(?:dispatch_stock_transfer_atomic|post_stock_transfer_atomic|post_stock_wastage_atomic|post_production_job_atomic)/);
});

test("inventory posting actions do not perform per-line ledger writes", () => {
  const operations = read("src/server/actions/stock-operations.ts");
  const manual = read("src/server/actions/stock-transactions.ts");
  const production = read("src/server/actions/production-jobs.ts");
  assert.match(operations, /rpc\("post_stock_transfer_atomic"/);
  assert.match(operations, /rpc\("dispatch_stock_transfer_atomic"/);
  assert.match(operations, /rpc\("post_stock_wastage_atomic"/);
  assert.match(manual, /rpc\("post_manual_inventory_movement"/);
  assert.match(production, /rpc\("post_production_job_atomic"/);
  assert.doesNotMatch(operations, /createInventoryMovement\(/);
  assert.doesNotMatch(manual, /from\("stock_transactions"\)\.insert/);
  assert.doesNotMatch(production, /from\("stock_transactions"\)\.insert/);
});
