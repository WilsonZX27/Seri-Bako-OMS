const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("People compliance and documents use explicit sibling work cards", () => {
  const page = read("src/app/(app)/people/[id]/page.tsx");
  assert.match(page, /title="Compliance summary"/);
  assert.match(page, /id="add-compliance-record" title="Add compliance record"/);
  assert.match(page, /id="add-employee-document" title="Add employee document"/);
  assert.match(page, /ComplianceRecordForm/);
  assert.doesNotMatch(page, /<details className="mt-3 border-t pt-3">/);
  assert.match(page, /staff\.email\?\.toLowerCase\(\)/);
});

test("PO and GRN tables nest clickable source documents under their primary number", () => {
  const po = read("src/app/(app)/purchase-orders/page.tsx");
  const grn = read("src/app/(app)/goods-receivings/page.tsx");
  assert.doesNotMatch(po, /<TableHead>Source PR<\/TableHead>/);
  assert.match(po, /From \{order\.request_no\}/);
  assert.match(po, /w-52 max-w-52/);
  assert.doesNotMatch(grn, /<TableHead>PO<\/TableHead>/);
  assert.match(grn, /From \{receiving\.po_no\}/);
  assert.match(grn, /purchase-orders\/\$\{receiving\.purchase_order_id\}/);
  for (const source of [po, grn]) {
    assert.match(source, /\[&>td\]:h-16 \[&>td\]:align-top/);
    assert.match(source, /line-clamp-2 leading-4/);
  }
});
