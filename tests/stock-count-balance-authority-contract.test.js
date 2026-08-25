import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/migrations/207_fix_stock_count_balance_authority.sql", "utf8");
const action = fs.readFileSync("src/server/actions/stock-counts.ts", "utf8");

test("Stock Count posting uses the same parent-or-line balance authority as the read model", () => {
  assert.match(migration, /not exists\s*\([\s\S]*stock_transaction_lines[\s\S]*stock_transaction_id = st\.id/);
  assert.match(migration, /union all[\s\S]*from public\.stock_transaction_lines stl/);
  assert.match(migration, /current_balance := public\.inventory_item_branch_balance/);
  assert.doesNotMatch(migration, /select coalesce\(sum\(quantity_in - quantity_out\), 0\)[\s\S]*from public\.stock_transactions\s+where item_id = line\.item_id/);
});

test("a genuine concurrent movement names the affected item and preserves the physical count", () => {
  assert.match(migration, /STOCK_SNAPSHOT_CONFLICT\|%\|%\|%\|%/);
  assert.match(action, /starting balance \$\{startingBalance\}, current balance \$\{currentBalance\}/);
  assert.match(action, /Your physical count is saved; review this item before posting/);
});
