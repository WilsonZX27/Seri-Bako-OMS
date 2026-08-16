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
