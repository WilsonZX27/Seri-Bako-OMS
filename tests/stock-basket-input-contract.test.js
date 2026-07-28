const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("stock-basket PR creation validates the complete JSON payload before database access", () => {
  const source = fs.readFileSync("src/server/actions/procurement.ts", "utf8");

  assert.match(source, /stockBasketGroupsSchema/);
  assert.match(source, /stockBasketLineSchema/);
  assert.match(source, /\.max\(20/);
  assert.match(source, /\.max\(100/);
  assert.match(source, /lineCount > 500/);
  assert.match(source, /raw\.length > 100_000/);
  assert.match(source, /parseStockBasketGroups\(formData\.get\("supplier_groups"\)\)/);
  assert.doesNotMatch(source, /const groups = JSON\.parse\(String\(formData\.get\("supplier_groups"\)/);
});
