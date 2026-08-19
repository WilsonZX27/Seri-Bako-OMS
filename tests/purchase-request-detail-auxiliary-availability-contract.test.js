const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.join(__dirname, "..", "src", "app", "(app)", "purchase-requests", "[id]", "page.tsx"), "utf8");

test("purchase-request detail preserves explicit auxiliary unavailable states", () => {
  assert.match(page, /Promise\.allSettled\(\[/);
  assert.doesNotMatch(page, /getPurchaseOrdersForRequest\(id\)\.catch\(\(\) => \[\]\)/);
  assert.doesNotMatch(page, /getItemsForSelect\(\)\.catch\(\(\) => \[\]\)/);
  assert.doesNotMatch(page, /getSuppliersForSelect\(\)\.catch\(\(\) => \[\]\)/);
  assert.doesNotMatch(page, /getBranchSupplierMappingsForSelect\(\)\.catch\(\(\) => \[\]\)/);
  assert.doesNotMatch(page, /getBranchesForSelect\(\)\.catch\(\(\) => \[\]\)/);
  for (const source of ["linkedOrders", "itemDirectory", "supplierDirectory", "supplierMappings", "branchDirectory", "documentBundle", "deletePreview"]) {
    assert.match(page, new RegExp(`page\\.purchaseRequestDetail\\.${source}`), source);
  }
});

test("incomplete reference directories cannot expose a writable draft form", () => {
  assert.match(page, /canEditDraft && items && supplierMappings && branches/);
  assert.match(page, /Draft editing unavailable/);
  assert.match(page, /Existing request lines remain read-only until you retry/);
  assert.match(page, /Item details unavailable/);
  assert.match(page, /diagnosePurchaseRequestSupplier/);
  assert.match(page, /Branch unavailable/);
});

test("linked orders and document activity distinguish unavailable from empty", () => {
  assert.match(page, /linkedPurchaseOrders === null[\s\S]*Linked purchase orders unavailable/);
  assert.match(page, /linkedPurchaseOrders\.length[\s\S]*No purchase order has been created/);
  assert.match(page, /documentBundleUnavailable[\s\S]*Document Activity/);
  assert.match(page, /documentBundleUnavailable[\s\S]*md:hidden[\s\S]*Document activity unavailable/);
});

test("request detail resolves current branch supplier mappings for legacy lines", () => {
  assert.match(page, /diagnosePurchaseRequestSupplier/);
  assert.match(page, /readinessByLine/);
  assert.match(page, /suggestedSupplierId/);
  assert.match(page, /PurchaseRequestLineRecovery/);
  assert.doesNotMatch(page, /No supplier suggested/);
});
