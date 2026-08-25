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
const listPage = readFileSync("src/app/(app)/goods-receivings/page.tsx", "utf8");

test("goods-receiving detail bounds every master-data join", () => {
  assert.match(detail, /\.in\("id", itemIds\)/);
  assert.match(detail, /\.eq\("id", receiving\.purchase_order_id\)/);
  assert.match(detail, /\.eq\("id", receiving\.supplier_id\)/);
  assert.match(detail, /\.eq\("id", receiving\.branch_id\)/);
  assert.doesNotMatch(detail, /from\("items"\)\.select\([^\n]+\)\s*[,)]/);
});

test("goods-receiving list fails closed when a related label source cannot be verified", () => {
  assert.match(source, /if \(!data \|\| count === null\) throw new Error\("Goods receiving list returned no data\."\)/);
  assert.match(source, /if \(!lines \|\| \(poIds\.length > 0 && !pos\) \|\| \(supplierIds\.length > 0 && !suppliers\)/);
  assert.match(source, /data: pos, error: posError/);
  assert.match(source, /data: suppliers, error: suppliersError/);
  assert.match(source, /data: branches, error: branchesError/);
  assert.match(source, /linesError \|\| posError \|\| suppliersError \|\| branchesError/);
  assert.match(listPage, /page\.goodsReceivings\.list/);
  assert.match(listPage, /Goods receiving data unavailable/);
  assert.match(listPage, /No quantities or record count are shown as zero/);
  assert.match(listPage, /resultCount=\{receivings\?\.totalRows\}/);
});

test("goods-receiving summary and detail never coerce null payloads into zero", () => {
  assert.match(source, /Goods receiving summary returned no data/);
  assert.match(source, /Goods receiving summary returned an incomplete result/);
  assert.match(detail, /const receiving = requireDetailRow\(data, "Goods receiving", id\)/);
  assert.match(detail, /if \(!lines\) throw new Error\("Goods receiving detail lines returned no data\."\)/);
  assert.match(detail, /Goods receiving detail related data returned no data/);
});

test("eligible receiving orders only hydrate their own lines and suppliers", () => {
  assert.match(eligible, /if \(!data\) throw new Error\("Eligible purchase orders returned no data\."\)/);
  assert.match(eligible, /if \(!data\.length\) return \[\]/);
  assert.match(eligible, /\.in\("purchase_order_id", purchaseOrderIds\)/);
  assert.match(eligible, /\.in\("id", supplierIds\)/);
  assert.match(eligible, /if \(suppliersError\) throw new Error\(suppliersError\.message\)/);
  assert.match(eligible, /if \(!lines \|\| !suppliers\) throw new Error/);
});

test("single purchase-order receiving only loads items referenced by its lines", () => {
  assert.match(receivingOrder, /\.eq\("purchase_order_id", id\)/);
  assert.match(receivingOrder, /\.in\("id", itemIds\)/);
  assert.match(receivingOrder, /if \(itemsError\) throw new Error\(itemsError\.message\)/);
  assert.match(receivingOrder, /if \(supplierError\) throw new Error\(supplierError\.message\)/);
  assert.match(receivingOrder, /if \(!order \|\| !lines\) throw new Error/);
  assert.match(receivingOrder, /if \(\(itemIds\.length > 0 && !items\) \|\| !supplier\) throw new Error/);
});
