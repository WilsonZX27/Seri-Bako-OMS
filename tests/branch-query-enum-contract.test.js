const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync("src/server/queries/foundation.ts", "utf8");

test("branch search does not apply text operators to the branch_type enum", () => {
  assert.doesNotMatch(source, /branch_type\.ilike/);
  assert.match(source, /branchTypes = \["central_kitchen", "outlet", "event_booth", "office", "other"\]/);
  assert.match(source, /branch_type\.eq\.\$\{normalizedType\}/);
});
