import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const suppliers = readFileSync("src/server/queries/suppliers.ts", "utf8");
const items = readFileSync("src/server/queries/items.ts", "utf8");
const common = readFileSync("src/server/queries/common.ts", "utf8");

test("supplier and item lists do not turn missing payloads into zero rows", () => {
  assert.match(suppliers, /if \(!data \|\| count === null\) throw new Error\("Supplier list returned no data\."\)/);
  assert.doesNotMatch(suppliers, /const totalRows = count \?\? 0/);
  assert.match(items, /if \(!items \|\| !suppliers\) throw new Error\("Item master data returned no data\."\)/);
  assert.match(items, /if \(!data \|\| typeof data !== "object" \|\| Array\.isArray\(data\)\) throw new Error\("Items workspace returned no data\."\)/);
  assert.match(items, /payload\.total_rows === null \|\| payload\.total_rows === undefined/);
  assert.doesNotMatch(items, /const totalRows = Number\(payload\.total_rows \?\? 0\)/);
});

test("shared select and mapping reads fail closed when Supabase returns null data", () => {
  assert.match(common, /if \(!data\) throw new Error\("Supplier options returned no data\."\)/);
  assert.match(common, /if \(!mappings\) throw new Error\("Branch supplier mappings returned no data\."\)/);
  assert.match(common, /if \(!relationships\) throw new Error\("Supplier item relationships returned no data\."\)/);
  assert.match(common, /if \(!data\) throw new Error\("Item options returned no data\."\)/);
  assert.match(common, /if \(!data\) throw new Error\("Branch options returned no data\."\)/);
});
