const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync("src/app/(app)/stock-card/page.tsx", "utf8");

test("stock card does not expose zero-derived summaries when the read is unavailable", () => {
  assert.match(source, /const resultCount = unavailable \? undefined : rows\.length/);
  assert.match(source, /<FilterBar resultCount=\{resultCount\}/);
  assert.match(source, /\{unavailable \? "Unavailable" : formatNumber\(value\)\}/);
  assert.match(source, /Current balance: \{unavailable \? "Unavailable"/);
  assert.match(source, /!rows\.length && !unavailable/);
});
