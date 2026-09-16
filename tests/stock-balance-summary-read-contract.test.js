const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const query = fs.readFileSync("src/server/queries/inventory.ts", "utf8");
const balancePage = fs.readFileSync("src/app/(app)/stock-balance/page.tsx", "utf8");
const ledgerPage = fs.readFileSync("src/app/(app)/stock-transactions/page.tsx", "utf8");
const migration = fs.readFileSync("supabase/migrations/300_stock_balance_summary.sql", "utf8");

test("stock balance summary is one RLS-preserving aggregate with list-aligned filters", () => {
  assert.match(migration, /from public\.stock_balances_summary/);
  assert.doesNotMatch(migration, /security definer/i);
  for (const parameter of ["p_branch_id", "p_supplier_id", "p_status", "p_search"]) assert.match(migration, new RegExp(parameter));
  assert.match(query, /rpc\("get_stock_balance_summary"/);
  assert.match(balancePage, /getStockBalanceSummary\(filters\)/);
  assert.doesNotMatch(balancePage, /balances\.rows\.reduce/);
  assert.doesNotMatch(balancePage, /balances\.rows\.filter/);
});

test("movement ledger valuation no longer transfers every stock balance row", () => {
  assert.match(ledgerPage, /getStockBalanceSummary\(filters\)/);
  assert.doesNotMatch(ledgerPage, /getStockBalanceDetails\(\{ \.\.\.filters, page: "all" \}\)/);
  assert.match(ledgerPage, /page\.stockTransactions\.balanceSummary/);
});
