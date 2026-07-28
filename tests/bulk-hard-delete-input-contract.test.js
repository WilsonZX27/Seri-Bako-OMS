const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("bulk permanent deletion bounds and validates submitted purchase-request IDs before database calls", () => {
  const source = fs.readFileSync("src/server/actions/hard-delete-bulk.ts", "utf8");

  assert.match(source, /purchaseRequestIdsSchema/);
  assert.match(source, /\.uuid\(/);
  assert.match(source, /\.max\(100/);
  assert.match(source, /value\.length > 8_000/);
  assert.match(source, /parsePurchaseRequestIds\(formData\.get\("record_ids"\)\)/);
  assert.doesNotMatch(source, /const ids = JSON\.parse/);
});
