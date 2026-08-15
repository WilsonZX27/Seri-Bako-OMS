const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.join(__dirname, "..", "src", "app", "(app)", "purchase-orders", "page.tsx"), "utf8");

test("purchase-order export directory cannot remove the operational queue", () => {
  assert.match(page, /async function loadExportBranches/);
  assert.match(page, /page\.purchaseOrders\.exportBranches/);
  assert.match(page, /return null/);
  assert.match(page, /exportBranches \? <PurchaseOrderExportDialog/);
  assert.match(page, /Export unavailable/);
  assert.match(page, /order queue remains available/);
  assert.doesNotMatch(page, /permissions\["po\.create"\] \? await getBranchesForSelect/);
});
