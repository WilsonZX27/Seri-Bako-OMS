const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const query = fs.readFileSync("src/server/queries/items.ts", "utf8");
const page = fs.readFileSync("src/app/(app)/items/[id]/page.tsx", "utf8");

test("item detail reads and sums only its own branch-visible balances", () => {
  const total = query.slice(
    query.indexOf("export async function getItemStockTotal"),
    query.indexOf("export async function getItemsWithStockPage"),
  );
  assert.match(total, /from\("stock_balances_summary"\)/);
  assert.match(total, /select\("current_qty"\)/);
  assert.match(total, /eq\("item_id", itemId\)/);
  assert.match(total, /reduce\(\(sum, balance\) => sum \+ Number\(balance\.current_qty\), 0\)/);
  assert.match(page, /getItemStockTotal\(id\)/);
  assert.doesNotMatch(page, /getItemsWithStock\(\)/);
});

test("the Items fallback aggregates repeated branch rows instead of keeping one branch", () => {
  const fallback = query.slice(
    query.indexOf("const getItemsWithStockBase"),
    query.indexOf("export async function getItemsWithStock("),
  );
  assert.match(fallback, /const existing = balanceByItemId\.get\(balance\.item_id\)/);
  assert.match(fallback, /Number\(existing\?\.current_stock \?\? 0\) \+ currentStock/);
  assert.doesNotMatch(fallback, /new Map\(balances\.map/);
});
