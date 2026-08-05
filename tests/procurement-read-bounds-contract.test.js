import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/server/queries/procurement.ts", "utf8");
const requestOrders = source.slice(
  source.indexOf("export async function getPurchaseOrdersForRequest"),
  source.indexOf("export async function getPurchaseOrders(", source.indexOf("export async function getPurchaseOrdersForRequest")),
);

test("purchase-request details bound downstream reads to their own purchase orders", () => {
  assert.match(requestOrders, /if \(!data\?\.length\) return \[\]/);
  assert.match(requestOrders, /\.in\("purchase_order_id", purchaseOrderIds\)/);
  assert.match(requestOrders, /\.in\("id", supplierIds\)/);
  assert.doesNotMatch(requestOrders, /from\("purchase_order_lines"\)\.select\("\*"\)\s*[,)]/);
});

test("purchase-request detail joins fail closed", () => {
  assert.match(requestOrders, /if \(linesError\) throw new Error\(linesError\.message\)/);
  assert.match(requestOrders, /if \(suppliersError\) throw new Error\(suppliersError\.message\)/);
});
