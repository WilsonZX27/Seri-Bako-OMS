const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const queryCases = [
  ["src/server/queries/foundation.ts", "getBranch", "getBranchSupplyRouteContext"],
  ["src/server/queries/foundation.ts", "getStaff", "getStaffAccess"],
  ["src/server/queries/foundation.ts", "getDocumentSequence", null],
  ["src/server/queries/documents.ts", "getDocument", "getDocumentBundle"],
  ["src/server/queries/goods-receivings.ts", "getGoodsReceiving", "getEligiblePurchaseOrders"],
  ["src/server/queries/inventory.ts", "getStockTransaction", "getStockLedger"],
  ["src/server/queries/items.ts", "getItem", null],
  ["src/server/queries/master-data.ts", "getSupplierItem", "getUomConversions"],
  ["src/server/queries/master-data.ts", "getUomConversion", "getItemSourcingReadiness"],
  ["src/server/queries/outlet-daily-records.ts", "getOutletDailyRecord", "getOutletDailyDemandTrend"],
  ["src/server/queries/procurement.ts", "getPurchaseOrder", "getPurchaseRequestForOrder"],
  ["src/server/queries/products.ts", "getProduct", null],
  ["src/server/queries/purchase-returns.ts", "getPurchaseReturn", null],
  ["src/server/queries/recipes.ts", "getRecipe", "getRecipeIngredientOptions"],
  ["src/server/queries/stock-operations.ts", "getStockTransfer", "getStockWastage"],
  ["src/server/queries/stock-operations.ts", "getStockWastageDetail", "getOperationSeedLines"],
  ["src/server/queries/supplier-invoices.ts", "getSupplierInvoice", null],
  ["src/server/queries/suppliers.ts", "getSupplier", null],
];

const pageCases = [
  ["src/app/(app)/branches/[id]/page.tsx", "getBranch"],
  ["src/app/(app)/document-sequences/[id]/page.tsx", "getDocumentSequence"],
  ["src/app/(app)/documents/[id]/page.tsx", "getDocumentBundle"],
  ["src/app/(app)/goods-receivings/[id]/page.tsx", "getGoodsReceiving"],
  ["src/app/(app)/items/[id]/page.tsx", "getItem"],
  ["src/app/(app)/outlet-daily-records/[id]/page.tsx", "getOutletDailyRecord"],
  ["src/app/(app)/people/[id]/page.tsx", "getStaff"],
  ["src/app/(app)/products/[id]/page.tsx", "getProduct"],
  ["src/app/(app)/purchase-orders/[id]/page.tsx", "getPurchaseOrder"],
  ["src/app/(app)/purchase-returns/[id]/page.tsx", "getPurchaseReturn"],
  ["src/app/(app)/recipes/[id]/page.tsx", "getRecipe"],
  ["src/app/(app)/recipes/[id]/edit/page.tsx", "getRecipe"],
  ["src/app/(app)/staffs/[id]/page.tsx", "getStaff"],
  ["src/app/(app)/stock-transactions/[id]/page.tsx", "getStockTransaction"],
  ["src/app/(app)/stock-transfers/[id]/page.tsx", "getStockTransfer"],
  ["src/app/(app)/stock-wastage/[id]/page.tsx", "getStockWastageDetail"],
  ["src/app/(app)/supplier-invoices/[id]/page.tsx", "getSupplierInvoice"],
  ["src/app/(app)/supplier-items/[id]/page.tsx", "getSupplierItem"],
  ["src/app/(app)/suppliers/[id]/page.tsx", "getSupplier"],
  ["src/app/(app)/uom-conversions/[id]/page.tsx", "getUomConversion"],
];

function functionSource(file, name, nextName) {
  const source = fs.readFileSync(file, "utf8");
  const start = source.indexOf(`export async function ${name}(`);
  assert.notEqual(start, -1, `${file} must export ${name}`);
  const end = nextName ? source.indexOf(`export async function ${nextName}(`, start) : source.length;
  assert.notEqual(end, -1, `${file} must export ${nextName} after ${name}`);
  return source.slice(start, end);
}

test("detail readers distinguish an absent row from database and authorization failures", () => {
  for (const [file, name, nextName] of queryCases) {
    const source = functionSource(file, name, nextName);
    assert.match(source, /\.maybeSingle\(\)/, `${name} must allow a zero-row result`);
    assert.match(source, /requireDetailRow\(/, `${name} must turn only an absent primary row into DetailNotFoundError`);
    assert.doesNotMatch(source, /\.single\(\)/, `${name} must not turn zero rows into a PostgREST runtime error`);
  }
});

test("dynamic detail pages translate DetailNotFoundError at the route boundary", () => {
  for (const [file, query] of pageCases) {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /import \{ detailOrNotFound \}/, `${file} must import the route-boundary helper`);
    assert.match(source, new RegExp(`detailOrNotFound\\(${query}\\(id\\)\\)`), `${file} must wrap ${query}`);
  }
});

test("the route-boundary helper preserves every non-not-found failure", () => {
  const source = fs.readFileSync("src/server/queries/detail.ts", "utf8");
  assert.match(source, /if \(row == null\) throw new DetailNotFoundError/);
  assert.match(source, /if \(error instanceof DetailNotFoundError\) notFound\(\)/);
  assert.match(source, /throw error;/);
  assert.doesNotMatch(source, /catch \{\s*notFound\(\)/);
});

test("purchase requests retain their explicit unavailable workspace instead of a generic route 404", () => {
  const page = fs.readFileSync("src/app/(app)/purchase-requests/[id]/page.tsx", "utf8");
  const source = functionSource("src/server/queries/procurement.ts", "getPurchaseRequest", "getPurchaseRequestBranchStock");
  assert.match(source, /\.maybeSingle\(\)/);
  assert.match(source, /if \(!data\) return null/);
  assert.match(page, /Purchase request not available/);
});
