import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/server/queries/goods-receivings.ts", "utf8");
const detail = source.slice(
  source.indexOf("export async function getGoodsReceiving("),
  source.indexOf("export async function getEligiblePurchaseOrders"),
);
const eligible = source.slice(
  source.indexOf("export async function getEligiblePurchaseOrders"),
  source.indexOf("export async function getPurchaseOrderForReceiving"),
);
const receivingOrder = source.slice(source.indexOf("export async function getPurchaseOrderForReceiving"));

test("goods-receiving detail bounds every master-data join", () => {
  assert.match(detail, /\.in\("id", itemIds\)/);
  assert.match(detail, /\.eq\("id", receiving\.purchase_order_id\)/);
  assert.match(detail, /\.eq\("id", receiving\.supplier_id\)/);
  assert.match(detail, /\.eq\("id", receiving\.branch_id\)/);
  assert.doesNotMatch(detail, /from\("items"\)\.select\([^\n]+\)\s*[,)]/);
});

test("eligible receiving orders only hydrate their own lines and suppliers", () => {
  assert.match(eligible, /if \(!data\?\.length\) return \[\]/);
  assert.match(eligible, /\.in\("purchase_order_id", purchaseOrderIds\)/);
  assert.match(eligible, /\.in\("id", supplierIds\)/);
  assert.match(eligible, /if \(suppliersError\) throw new Error\(suppliersError\.message\)/);
});

test("single purchase-order receiving only loads items referenced by its lines", () => {
  assert.match(receivingOrder, /\.eq\("purchase_order_id", id\)/);
  assert.match(receivingOrder, /\.in\("id", itemIds\)/);
  assert.match(receivingOrder, /if \(itemsError\) throw new Error\(itemsError\.message\)/);
  assert.match(receivingOrder, /if \(supplierError\) throw new Error\(supplierError\.message\)/);
});
