const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("permission-aware mobile create actions remain discoverable", () => {
  const purchaseReturns = read("src/app/(app)/purchase-returns/page.tsx");
  const supplierInvoices = read("src/app/(app)/supplier-invoices/page.tsx");

  assert.match(purchaseReturns, /hideMobileConsole=\{!canCreate\}/);
  assert.match(purchaseReturns, /data-mobile-primary-action/);
  assert.match(supplierInvoices, /const hasMobileAction =/);
  assert.match(supplierInvoices, /hideMobileConsole=\{!hasMobileAction\}/);
  assert.match(supplierInvoices, /data-mobile-primary-action/);
});

test("operational queues expose their action rail on tablet", () => {
  for (const file of [
    "src/app/(app)/purchase-returns/page.tsx",
    "src/app/(app)/supplier-invoices/page.tsx",
    "src/app/(app)/production/jobs/page.tsx",
  ]) {
    assert.match(read(file), /tabletRailMode="split"/, `${file} must expose its rail from tablet width`);
  }
});
