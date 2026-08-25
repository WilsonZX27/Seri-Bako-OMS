import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/server/queries/inventory.ts", "utf8");
const ledgerPage = readFileSync("src/app/(app)/stock-transactions/page.tsx", "utf8");
const detail = source.slice(
  source.indexOf("export async function getStockTransaction(id: string)"),
  source.indexOf("export async function getStockLedger"),
);

test("stock transaction detail only loads its referenced item and branch", () => {
  assert.match(detail, /const transaction = requireDetailRow\(data, "Stock transaction", id\)/);
  assert.match(detail, /\.eq\("id", transaction\.item_id\)\.maybeSingle\(\)/);
  assert.match(detail, /\.eq\("id", transaction\.branch_id\)\.maybeSingle\(\)/);
  assert.doesNotMatch(detail, /new Map/);
});

test("stock transaction detail joins fail closed", () => {
  assert.match(detail, /if \(itemError\) throw new Error\(itemError\.message\)/);
  assert.match(detail, /if \(branchError\) throw new Error\(branchError\.message\)/);
});

test("optional inventory insights use a strict base-table fallback instead of an invented zero", () => {
  assert.match(source, /getInventoryDailyMovementFromBaseTables/);
  assert.match(source, /MAX_INVENTORY_DAILY_MOVEMENT_FALLBACK_ROWS/);
  assert.match(source, /daily movement summary table fallback/);
  assert.match(source, /unavailable: true/);
});

test("stock balance failures remain unavailable in ledger valuation", () => {
  assert.match(source, /unavailable: true \}\;/);
  assert.match(ledgerPage, /const balanceUnavailable = Boolean\(balances\.unavailable \|\| balances\.error\)/);
  assert.match(ledgerPage, /Stock Balance data is temporarily unavailable/);
  assert.match(ledgerPage, /balanceUnavailable \? "Unavailable"/);
});
