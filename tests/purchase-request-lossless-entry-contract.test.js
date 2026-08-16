import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("purchase request entry never silently filters incomplete user-entered lines", () => {
  const action = read("src/server/actions/procurement.ts");
  assert.match(action, /formData\.getAll\("line_description"\)/);
  assert.match(action, /enteredLineIndexes/);
  assert.match(action, /entered text is never discarded/);
  assert.doesNotMatch(action, /\.filter\(\(line\) => line\.item_id && String\(line\.qty/);
});

test("purchase request item lookup uses an explicit token-matching combobox", () => {
  const form = read("src/components/procurement-forms.tsx");
  assert.match(form, /function normalizedSearchTokens/);
  assert.match(form, /tokens\.every\(\(token\) => searchable\.includes\(token\)\)/);
  assert.match(form, /role="combobox"/);
  assert.match(form, /role="listbox"/);
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
  assert.match(detail, /Select Item Master match/);
});

test("typing an unmatched description does not erase quantity or UOM", () => {
  const form = read("src/components/procurement-forms.tsx");
  assert.match(form, /updateLine\(key, \{ itemSearch: value, itemId: "", supplierId: "", cost: "0" \}\)/);
  assert.doesNotMatch(form, /itemSearch: value, itemId: "", uom: ""/);
});
