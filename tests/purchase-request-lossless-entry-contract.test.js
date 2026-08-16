import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function loadLineExtractor() {
  const source = read("src/lib/procurement/purchase-request-lines.ts");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const testModule = { exports: {} };
  vm.runInNewContext(`(function(module, exports) { ${code}\n})(testModule, testModule.exports);`, {
    testModule,
    FormData,
  });
  return testModule.exports.extractPurchaseRequestLineInputs;
}

test("purchase request entry never silently filters incomplete user-entered lines", () => {
  const action = read("src/server/actions/procurement.ts");
  const extractor = read("src/lib/procurement/purchase-request-lines.ts");
  assert.match(action, /extractPurchaseRequestLineInputs\(formData\)/);
  assert.match(extractor, /formData\.getAll\("line_description"\)/);
  assert.match(extractor, /enteredLineIndexes/);
  assert.match(extractor, /entered text is never discarded/);
  assert.doesNotMatch(extractor, /\.filter\(\(line\) => line\.item_id && String\(line\.qty/);
});

test("purchase request item lookup uses an explicit token-matching combobox", () => {
  const form = read("src/components/procurement-forms.tsx");
  const combobox = read("src/components/item-combobox.tsx");
  const resolution = read("src/components/purchase-request-line-resolution-form.tsx");
  assert.match(combobox, /function searchTokens/);
  assert.match(combobox, /tokens\.every\(\(token\) => searchable\.includes\(token\)\)/);
  assert.match(combobox, /role="combobox"/);
  assert.match(combobox, /role="listbox"/);
  assert.match(form, /<ItemCombobox/);
  assert.match(resolution, /<ItemCombobox/);
  assert.match(form, /name="line_description"/);
  assert.doesNotMatch(form, /<datalist id="purchase-request-items">/);
});

test("unmatched descriptions remain submittable and are stored atomically", () => {
  const form = read("src/components/procurement-forms.tsx");
  const action = read("src/server/actions/procurement.ts");
  const query = read("src/server/queries/procurement.ts");
  const detail = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  const migration = read("supabase/migrations/152_lossless_non_catalog_purchase_request_lines.sql");

  assert.match(form, /knownSystemUoms/);
  assert.doesNotMatch(form, /name="line_uom"[^>]+disabled=\{!line\.itemId\}/);
  assert.match(action, /unresolved_lines: unresolvedLines/);
  assert.match(action, /lines_value: \{[\s\S]*resolved:[\s\S]*unresolved:/);
  assert.match(query, /purchase_request_unresolved_lines/);
  assert.match(detail, /Non-catalog item/);
  assert.match(migration, /create table if not exists public\.purchase_request_unresolved_lines/);
  assert.match(migration, /jsonb_array_length\(lines\)\+jsonb_array_length\(unresolved_lines\)/);
  assert.match(migration, /Resolve every non-catalog request line before completing Purchasing Review/);
  assert.match(migration, /resolve_purchase_request_unresolved_line/);
  assert.match(detail, /resolvePurchaseRequestUnresolvedLine/);
  assert.match(detail, /PurchaseRequestLineResolutionForm/);
});

test("typing an unmatched description does not erase quantity or UOM", () => {
  const form = read("src/components/procurement-forms.tsx");
  assert.match(form, /updateLine\(key, \{ itemSearch: value, itemId: "", supplierId: "", cost: "0" \}\)/);
  assert.doesNotMatch(form, /itemSearch: value, itemId: "", uom: ""/);
});

test("one matched catalog item cannot cause the other entered PR lines to disappear", () => {
  const extract = loadLineExtractor();
  const form = new FormData();
  const entries = [
    { id: "11111111-1111-4111-8111-111111111111", description: "ALL PURPOSE FLOUR", qty: "3", uom: "CTN" },
    { id: "", description: "CHEK HUP SUGAR CANE ROCK SUGAR", qty: "5", uom: "KG" },
    { id: "", description: "LEMON", qty: "5", uom: "NOS" },
    { id: "", description: "P1 SUGAR PRAI 50KG", qty: "2", uom: "BAG" },
    { id: "", description: "MSM BROWN SUGAR PRAI", qty: "1", uom: "BAG" },
    { id: "", description: "NATUREL SUNFLOWER OIL 3KG", qty: "3", uom: "TUB" },
  ];
  for (const entry of entries) {
    form.append("line_item_id", entry.id);
    form.append("line_description", entry.description);
    form.append("line_qty", entry.qty);
    form.append("line_uom", entry.uom);
    form.append("line_estimated_unit_cost", "0");
    form.append("line_suggested_supplier_id", "");
    form.append("line_reason", "");
    form.append("line_remarks", "");
    form.append("line_branch_id", "22222222-2222-4222-8222-222222222222");
  }

  const result = extract(form);
  assert.equal(result.lines.length, 1);
  assert.equal(result.unresolvedLines.length, 5);
  assert.equal(result.lines.length + result.unresolvedLines.length, entries.length);
  assert.equal(result.lines[0].qty, "3");
  assert.deepEqual(
    Array.from(result.unresolvedLines, (line) => [line.requested_description, line.requested_qty, line.requested_uom]),
    entries.slice(1).map((entry) => [entry.description, entry.qty, entry.uom]),
  );
});

test("an incomplete entered line fails the whole save instead of partially saving valid siblings", () => {
  const extract = loadLineExtractor();
  const form = new FormData();
  for (const [name, value] of [
    ["line_item_id", "11111111-1111-4111-8111-111111111111"],
    ["line_description", "ALL PURPOSE FLOUR"],
    ["line_qty", "3"],
    ["line_uom", "CTN"],
    ["line_item_id", ""],
    ["line_description", "LEMON"],
    ["line_qty", "5"],
    ["line_uom", ""],
  ]) form.append(name, value);

  assert.throws(() => extract(form), /Nothing was saved.*line 2.*never discarded/);
});
