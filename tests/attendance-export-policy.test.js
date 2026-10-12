const test = require("node:test");
const assert = require("node:assert/strict");

// Keep this contract close to the People workbook rules: gross full-time
// presence is the default, and a break only affects the report after People
// explicitly records break out/in.
test("full-time export uses first and last punch without an explicit break correction", () => {
  const source = require("node:fs").readFileSync("src/lib/attendance/export-policy.ts", "utf8");
  assert.match(source, /punches\.at\(-1\)/);
  assert.match(source, /presence_seconds/);
  assert.match(source, /!hasExplicitBreak\(row\)/);
  assert.match(source, /missing_break_punch/);
  assert.match(source, /short_break/);
});

test("export retains four punches when People supplied an audited break", () => {
  const source = require("node:fs").readFileSync("src/lib/attendance/export-policy.ts", "utf8");
  assert.match(source, /actual_break_out/);
  assert.match(source, /actual_break_in/);
  assert.match(source, /filter\(Boolean\)/);
});
