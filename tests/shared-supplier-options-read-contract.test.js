const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const common = fs.readFileSync("src/server/queries/common.ts", "utf8");

test("shared supplier option boundaries use the same minimal projection", () => {
  const start = common.indexOf("export const getSuppliersForSelect");
  const end = common.indexOf("export const getItemsForSelect");
  const boundary = common.slice(start, end);

  assert.doesNotMatch(boundary, /from\("suppliers"\)\.select\("\*"\)/);
  assert.equal(
    boundary.match(/select\("id,supplier_code,supplier_group,name,status"\)/g)?.length,
    2,
  );
});
