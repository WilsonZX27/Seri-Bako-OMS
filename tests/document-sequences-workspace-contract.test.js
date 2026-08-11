const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "src/app/(app)/document-sequences/page.tsx"), "utf8");

test("document sequences uses the shared contained technical-table pattern", () => {
  assert.match(source, /<WorkspaceGrid rightRail=/);
  assert.match(source, /<Table aria-label="Document sequences"[^>]*>/);
  assert.doesNotMatch(source, /<div className="overflow-x-auto">/);
  assert.match(source, /Next Number/);
  assert.match(source, /Opening Balance:[\s\S]*not a stock-record count/);
});
