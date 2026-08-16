import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/server/queries/procurement.ts", "utf8");
const requestList = readFileSync("src/app/(app)/purchase-requests/page.tsx", "utf8");
const orderList = readFileSync("src/app/(app)/purchase-orders/page.tsx", "utf8");
const requestOrders = source.slice(
  source.indexOf("export async function getPurchaseOrdersForRequest"),
  source.indexOf("export async function getPurchaseOrders(", source.indexOf("export async function getPurchaseOrdersForRequest")),
);

test("purchase-request details bound downstream reads to their own purchase orders", () => {
  assert.match(requestOrders, /if \(!data\) throw new Error\("Purchase request purchase orders returned no data\."\)/);
  assert.match(requestOrders, /if \(!data\.length\) return \[\]/);
  assert.match(requestOrders, /\.in\("purchase_order_id", purchaseOrderIds\)/);
  assert.match(requestOrders, /\.in\("id", supplierIds\)/);
  assert.doesNotMatch(requestOrders, /from\("purchase_order_lines"\)\.select\("\*"\)\s*[,)]/);
});

test("purchase-request detail joins fail closed", () => {
  assert.match(requestOrders, /if \(linesError\) throw new Error\(linesError\.message\)/);
  assert.match(requestOrders, /if \(suppliersError\) throw new Error\(suppliersError\.message\)/);
  assert.match(requestOrders, /if \(!lines \|\| !suppliers\) throw new Error/);
});

test("procurement list joins fail closed and preserve an explicit unavailable state", () => {
  const requests = source.slice(source.indexOf("export async function getPurchaseRequests"), source.indexOf("export async function getPurchaseRequestSummary"));
  const orders = source.slice(source.indexOf("export async function getPurchaseOrders("), source.indexOf("export async function getPurchaseOrderSummary"));
  assert.match(requests, /data: branches, error: branchesError/);
  assert.match(requests, /linesError \|\| branchesError/);
  assert.match(orders, /data: suppliers, error: suppliersError/);
  assert.match(orders, /linesError \|\| suppliersError/);
  assert.match(requestList, /page\.purchaseRequests\.list/);
  assert.match(requestList, /Purchase request data unavailable/);
  assert.match(requestList, /No record count or estimated total is shown as zero/);
  assert.match(requestList, /resultCount=\{requests\?\.totalRows\}/);
  assert.match(orderList, /page\.purchaseOrders\.list/);
  assert.match(orderList, /Purchase order data unavailable/);
  assert.match(orderList, /No record count or order total is shown as zero/);
  assert.match(orderList, /resultCount=\{orders\?\.totalRows\}/);
  assert.match(requests, /if \(!data \|\| count === null\) throw new Error\("Purchase request list returned no data\."\)/);
  assert.match(orders, /if \(!data \|\| count === null\) throw new Error\("Purchase order list returned no data\."\)/);
});

test("procurement summaries do not convert missing counts to zero", () => {
  assert.match(source, /Purchase request summary returned no data/);
  assert.match(source, /Purchase order summary returned no data/);
});
