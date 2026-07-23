const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migration = fs.readFileSync("supabase/migrations/098_inventory_document_terminal_atomicity.sql", "utf8");
const grnActions = fs.readFileSync("src/server/actions/goods-receivings.ts", "utf8");
const returnActions = fs.readFileSync("src/server/actions/purchase-returns.ts", "utf8");
const productionActions = fs.readFileSync("src/server/actions/production-jobs.ts", "utf8");

test("remaining inventory terminal transitions are database-owned aggregates", () => {
  for (const rpc of ["cancel_goods_receiving_atomic", "cancel_purchase_return_atomic", "transition_production_job_atomic"]) {
    assert.match(migration, new RegExp(`create or replace function public\\.${rpc}`));
    assert.match(migration, /for update/);
    assert.match(migration, /document_revisions/);
    assert.match(migration, /activity_logs/);
  }
  assert.match(migration, /has_permission\('goods_receiving\.cancel'\)/);
  assert.match(migration, /has_permission\('purchase_return\.cancel'\)/);
  assert.match(migration, /production\.submit/);
  assert.match(migration, /production\.approve/);
  assert.match(migration, /production\.reject/);
  assert.match(migration, /production\.cancel/);
  assert.match(grnActions, /rpc\("cancel_goods_receiving_atomic"/);
  assert.match(returnActions, /rpc\("cancel_purchase_return_atomic"/);
  assert.match(productionActions, /rpc\("transition_production_job_atomic"/);
});
