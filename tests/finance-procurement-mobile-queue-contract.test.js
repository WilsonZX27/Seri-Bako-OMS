const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("supplier invoices expose overdue risk and linked receiving context on phones", () => {
  const source = read("src/app/(app)/supplier-invoices/page.tsx");

  assert.match(source, /row\.is_overdue/);
  assert.match(source, /Overdue — action required/);
  assert.match(source, /row\.grn_no \?\? row\.po_no/);
  assert.match(source, /formatCurrency\(row\.balance_due\)/);
});

test("purchase returns retain linked PO, quantity, and financial value on phones", () => {
  const source = read("src/app/(app)/purchase-returns/page.tsx");

  assert.match(source, /PO \{row\.po_no \?\? "not linked"\}/);
  assert.match(source, /formatNumber\(row\.return_total\)/);
  assert.match(source, /formatCurrency\(row\.return_value\)/);
});
