const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("shared action-led tables keep action columns compact", () => {
  const table = fs.readFileSync("src/components/ui/table.tsx", "utf8");
  const css = fs.readFileSync("src/app/globals.css", "utf8");

  assert.match(table, /data-table-action-head=\{isActionColumn \? "true" : undefined\}/);
  assert.match(table, /isActionCell = React\.Children\.toArray\(children\)/);
  assert.match(table, /!w-10 !min-w-10 !max-w-10/);
  assert.match(css, /table:has\(> thead > tr > th\[data-table-action-head="true"\]\)/);
  assert.match(css, /table-layout: fixed/);
});
