const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "components", "layout", "mobile-context-header.tsx"), "utf8");

test("secondary phone workspaces retain their own centered title and parent context", () => {
  for (const title of ["AP Aging", "Cash Flow Forecast", "Stock Card", "Supplier Items", "UOM Conversions", "Production Planning", "Demand Variance", "Procurement Variance"]) {
    assert.match(source, new RegExp(`title: "${title}"`));
  }
  assert.match(source, /backHref: "\/supplier-invoices"/);
  assert.match(source, /backHref: "\/reports"/);
  assert.match(source, /backHref: "\/production\/jobs"/);
  assert.match(source, /sort\(\(a, b\) => b\.length - a\.length\)/);
});
