const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const query = fs.readFileSync("src/server/queries/inventory.ts", "utf8");
const search = query.match(/function searchExpression\([\s\S]*?\n}/)?.[0] ?? "";

test("stock balance search treats punctuation as literal PostgREST filter text", () => {
  assert.match(search, /\.ilike\."%\$\{term\}%"/);
  assert.match(search, /search\.replace\(\/\[\\\\%_"\]\/g, "\\\\\$&"\)/);
  assert.doesNotMatch(search, /replace\(\/\[\(\),\]/);
});
