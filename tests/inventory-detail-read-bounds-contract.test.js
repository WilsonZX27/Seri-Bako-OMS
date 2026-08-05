import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/server/queries/inventory.ts", "utf8");
const detail = source.slice(
  source.indexOf("export async function getStockTransaction(id: string)"),
  source.indexOf("export async function getStockLedger"),
);

test("stock transaction detail only loads its referenced item and branch", () => {
  assert.match(detail, /\.eq\("id", data\.item_id\)\.maybeSingle\(\)/);
  assert.match(detail, /\.eq\("id", data\.branch_id\)\.maybeSingle\(\)/);
  assert.doesNotMatch(detail, /new Map/);
});

test("stock transaction detail joins fail closed", () => {
  assert.match(detail, /if \(itemError\) throw new Error\(itemError\.message\)/);
  assert.match(detail, /if \(branchError\) throw new Error\(branchError\.message\)/);
});
