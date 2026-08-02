const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Stock Count cancellation uses one forward-only atomic RPC", () => {
  const action = read("src/server/actions/stock-counts.ts");
  const migration = read("supabase/migrations/114_stock_count_cancel_atomicity.sql");
  const removalMigration = read("supabase/migrations/118_stock_count_cancel_removes_active_work.sql");

  assert.match(action, /rpc\("cancel_stock_count_atomic", \{ p_stock_count_id: countId \}\)/);
  assert.doesNotMatch(action, /from\("stock_counts"\)\s*\.update\(\{ status: "cancelled"/);
  assert.match(migration, /create or replace function public\.cancel_stock_count_atomic\(p_stock_count_id uuid\)/);
  assert.match(migration, /for update/);
  assert.match(migration, /update public\.stock_counts/);
  assert.match(migration, /update public\.documents/);
  assert.match(migration, /insert into public\.activity_logs/);
  assert.match(migration, /grant execute on function public\.cancel_stock_count_atomic\(uuid\) to authenticated/);
  assert.match(removalMigration, /create or replace function public\.cancel_stock_count_atomic/);
  assert.match(removalMigration, /deleted_at = now\(\)/);
  assert.match(removalMigration, /'deleted', true/);
  assert.match(action, /safeRedirectWithMessage\("\/stock-counts", "success", "Stock Count cancelled/);
});
