import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/server/queries/stock-operations.ts", "utf8");
const transfer = source.slice(
  source.indexOf("export async function getStockTransfer(id: string)"),
  source.indexOf("export async function getStockWastage("),
);
const wastage = source.slice(
  source.indexOf("export async function getStockWastageDetail"),
  source.indexOf("export async function getOperationSeedLines"),
);

test("stock transfer detail bounds item and branch hydration", () => {
  assert.match(transfer, /\.in\("id", itemIds\)/);
  assert.match(transfer, /\.in\("id", branchIds\)/);
  assert.match(transfer, /\.eq\("stock_transfer_id", id\)/);
});

test("stock wastage detail bounds item and branch hydration", () => {
  assert.match(wastage, /\.in\("id", itemIds\)/);
  assert.match(wastage, /\.eq\("id", wastage\.branch_id\)/);
  assert.match(wastage, /\.eq\("stock_wastage_id", id\)/);
});
