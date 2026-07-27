const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("stock card reuses the operational workspace, compact filter rail, and contained technical table", () => {
  const source = read("src/app/(app)/stock-card/page.tsx");

  assert.match(source, /<WorkspaceGrid className="p-3 sm:p-4">/);
  assert.match(source, /<FilterBar resultCount=\{rows\.length\} resetHref="\/stock-card" filtered=\{filtered\}>/);
  assert.match(source, /aria-label="Stock movement history"/);
  assert.doesNotMatch(source, /<Card|<CardContent|overflow-x-auto/);
  assert.match(source, /Movement summary/);
});

test("stock card treats the all-items control value as an unfiltered ledger", () => {
  const source = read("src/server/queries/inventory.ts");

  assert.match(source, /const itemId = filters\.item_id && filters\.item_id !== "all" \? filters\.item_id : null;/);
});
