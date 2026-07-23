const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migration = fs.readFileSync("supabase/migrations/085_inventory_concurrency_hardening.sql", "utf8");

test("inventory concurrency hardening serializes opening stock and protects the business key", () => {
  assert.match(migration, /stock_transactions_opening_branch_item_idx/);
  assert.match(migration, /opening:' \|\| p_branch_id::text \|\| ':' \|\| p_item_id::text/);
  assert.match(migration, /post_opening_stock\(/);
});

test("GRN posting locks PO lines and revalidates current remaining quantity", () => {
  assert.match(migration, /purchase_order_lines where id = line\.purchase_order_line_id.*for update/);
  assert.match(migration, /po_line\.qty_ordered - po_line\.qty_received - po_line\.qty_cancelled/);
  assert.match(migration, /inventory_lock_item_location\(line\.item_id, grn\.location_id\)/);
});

test("returns and stock counts lock inventory keys and use current ledger balance", () => {
  assert.match(migration, /inventory_lock_item_location\(line\.item_id, ret\.location_id\)/);
  assert.match(migration, /into current_balance from public\.stock_transactions/);
  assert.match(migration, /variance := line\.physical_qty - current_balance/);
});
