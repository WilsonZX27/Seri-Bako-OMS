const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const querySource = fs.readFileSync(path.join(root, "src/server/queries/inventory.ts"), "utf8");
const pageSource = fs.readFileSync(path.join(root, "src/app/(app)/stock-transactions/page.tsx"), "utf8");
const migrationSource = fs.readFileSync(path.join(root, "supabase/migrations/133_bounded_stock_ledger_page.sql"), "utf8");

test("Movement Ledger uses a bounded paginated RPC instead of stock_ledger_view", () => {
  const ledgerQuery = querySource.slice(querySource.indexOf("export async function getStockLedger"), querySource.indexOf("export async function getStockBalanceDetails"));
  assert.match(ledgerQuery, /rpc\("get_stock_ledger_bounded_page"/);
  assert.doesNotMatch(ledgerQuery.split("if (isMockMode())")[1], /from\("stock_ledger_view"\)/);
  assert.match(ledgerQuery, /INVENTORY_PAGE_SIZE/);
  assert.match(ledgerQuery, /thirtyDaysAgo/);
});

test("Movement Ledger exposes its default bounded period in the filter UI", () => {
  assert.match(pageSource, /from: requestedFilters\.from \|\| thirtyDaysAgo/);
  assert.match(pageSource, /to: requestedFilters\.to \|\| today/);
});

test("bounded ledger page preserves running balances and paginates after filtering", () => {
  assert.match(migrationSource, /get_stock_card_bounded/);
  assert.match(migrationSource, /count\(\*\) over \(\) as total_count/);
  assert.ok(migrationSource.indexOf("get_stock_card_bounded") < migrationSource.indexOf("offset greatest"));
  assert.match(migrationSource, /security invoker/);
  assert.match(migrationSource, /grant execute[\s\S]*to authenticated/);
  assert.match(migrationSource, /least\(p_limit, 50000\)/);
});
