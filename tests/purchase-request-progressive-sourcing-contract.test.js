import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("PR Item Master search is not blocked by a missing supplier route", () => {
  const form = read("src/components/procurement-forms.tsx");
  const action = read("src/server/actions/procurement.ts");
  const newPage = read("src/app/(app)/purchase-requests/new/page.tsx");
  const readiness = read("src/lib/purchase-request-readiness.ts");

  assert.match(form, /const selectableItems = items\.map/);
  assert.match(form, /suppliers\.map\(\(supplier\) =>/);
  assert.match(form, /Purchasing can confirm the supplier route during review/);
  assert.match(form, /supplierId: requestSupplierId/);
  assert.match(action, /const normalizedLines = parsed\.lines\.map/);
  assert.match(action, /if \(selected\.some\(\(line\) => !isValid\(line\)\) && requireAll\)/);
  assert.match(newPage, /getSuppliersForSelect/);
  assert.match(newPage, /suppliers=\{suppliers\}/);
  assert.match(readiness, /A PR supplier is a suggested source/);
  assert.match(readiness, /explicit && supplierIds\.has\(explicit\)/);
});

test("PR still requires a single suggested supplier while allowing provisional sourcing", () => {
  const form = read("src/components/procurement-forms.tsx");
  const action = read("src/server/actions/procurement.ts");

  assert.match(form, /Choose one supplier for this purchase request/);
  assert.match(action, /if \(!requestSupplierId\) throw new Error\("Select a supplier before adding request items\."\)/);
  assert.match(action, /normalizedLines\.some\(\(line\) => line\.suggested_supplier_id !== requestSupplierId\)/);
});
