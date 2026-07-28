const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("stock count and outlet record transitions validate IDs and privileged reasons before RPC calls", () => {
  const counts = read("src/server/actions/stock-counts.ts");
  const outlets = read("src/server/actions/outlet-daily-records.ts");
  assert.match(counts, /const stockCountIdSchema = z\.uuid/);
  assert.match(counts, /const countId = stockCountIdSchema\.parse\(id\)/);
  assert.match(outlets, /z\.uuid\("Invalid outlet daily record identifier\."\)\.parse\(id\)/);
  assert.match(outlets, /A void reason is required/);
});
