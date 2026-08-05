const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "130_items_workspace_rpc.sql"), "utf8");

test("Items workspace uses an RLS-scoped RPC and bounds the page payload", () => {
  assert.match(migration, /security invoker/i);
  assert.match(migration, /limit greatest\(1, least\(coalesce\(p_page_size, 15\), 100\)\)/i);
  assert.match(migration, /offset \(greatest\(coalesce\(p_page, 1\), 1\) - 1\)/i);
});

test("Items workspace aggregates branch stock to one row per item before pagination", () => {
  assert.match(migration, /group by s\.item_id/i);
  assert.match(migration, /bool_or\(s\.is_low_stock\)/i);
  assert.match(migration, /'summary'/i);
  assert.match(migration, /'categories'/i);
});

test("Items workspace preserves archived, stock-control, and low-stock filters", () => {
  assert.match(migration, /p_status = 'archived' and row\.deleted_at is not null/i);
  assert.match(migration, /p_stock_control = 'with_safety_stock'/i);
  assert.match(migration, /p_stock_control = 'without_safety_stock'/i);
  assert.match(migration, /p_low_stock = 'yes' and row\.is_low_stock/i);
  assert.match(migration, /p_low_stock = 'no' and not row\.is_low_stock/i);
});
