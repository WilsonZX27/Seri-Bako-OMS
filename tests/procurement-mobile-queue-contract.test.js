const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("purchase order mobile search and rows expose delivery context", () => {
  const source = read("src/app/(app)/purchase-orders/page.tsx");

  assert.match(source, /<UnifiedListHeader resultCount=\{orders\?\.totalRows\} resetHref="\/purchase-orders"/);
  assert.match(source, /sb-list-content-card/);
  assert.match(source, /placeholder="Search PO no, supplier, remarks"/);
  assert.match(source, /Delivery \{formatDateOnly\(order\.expected_delivery_date, "not set"\)\}/);
  assert.match(source, /order\.line_count/);
  assert.match(source, /formatCurrency\(order\.order_total\)/);
});

test("goods receiving mobile rows expose source, scope, and variance", () => {
  const source = read("src/app/(app)/goods-receivings/page.tsx");

  assert.match(source, /\{receiving\.po_no \?\? "No linked PO"\}/);
  assert.doesNotMatch(source, />PO \{receiving\.po_no/);
  assert.match(source, /receiving\.branch_name \?\? "No branch"/);
  assert.match(source, /formatNumber\(receiving\.received_total\).*formatNumber\(receiving\.rejected_total\)/s);
});
