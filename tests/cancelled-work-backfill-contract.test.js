const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const migration = fs.readFileSync(
  path.join(process.cwd(), "supabase", "migrations", "122_backfill_cancelled_work_deleted_at.sql"),
  "utf8",
);

test("cancelled unposted work is hidden from active lists by a forward-only backfill", () => {
  for (const table of [
    "goods_receivings",
    "purchase_returns",
    "production_jobs",
    "stock_transfers",
    "stock_wastage",
    "stock_counts",
    "purchase_requests",
    "purchase_orders",
  ]) {
    assert.match(migration, new RegExp(`update public\\.${table}`));
  }
  assert.match(migration, /where status = 'cancelled'/g);
  assert.match(migration, /deleted_at = coalesce\(deleted_at, updated_at, now\(\)\)/g);
  assert.doesNotMatch(migration, /delete from/i);
});
