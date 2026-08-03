const fs = require("node:fs");
const test = require("node:test");
const assert = require("node:assert/strict");

test("removed Stock Counts are not addressable through the operational detail query", () => {
  const source = fs.readFileSync("src/server/queries/stock-counts.ts", "utf8");
  assert.match(
    source,
    /from\("stock_counts"\)\.select\("\*"\)\.eq\("id", id\)\.is\("deleted_at", null\)\.single\(\)/,
  );
});
