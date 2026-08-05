const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const querySource = fs.readFileSync(path.join(root, "src/server/queries/inventory.ts"), "utf8");
const migrationSource = fs.readFileSync(path.join(root, "supabase/migrations/131_bounded_stock_card_read_model.sql"), "utf8");

test("Stock Card uses its bounded RPC instead of loading the full ledger", () => {
  const stockCard = querySource.slice(querySource.indexOf("export async function getStockCard"), querySource.indexOf("export async function getLowStockItems"));
  assert.match(stockCard, /rpc\("get_stock_card_bounded"/);
  assert.doesNotMatch(stockCard.split("if (!isMockMode())")[1].split("const ledger")[0], /page:\s*"all"/);
});

test("bounded read model filters the period before its running window", () => {
  assert.match(migrationSource, /transaction_date between p_from and p_to/);
  assert.match(migrationSource, /opening_balance/);
  assert.match(migrationSource, /sum\(p\.quantity_in - p\.quantity_out\) over/);
  assert.match(migrationSource, /can_access_inventory_branch/);
  assert.match(migrationSource, /grant execute[\s\S]*to authenticated/);
});
