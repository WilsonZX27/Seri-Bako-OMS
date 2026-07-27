const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "components", "stock-balance-workspace.tsx"), "utf8");

test("stock balance does not duplicate mobile navigation with a generic action bar", () => {
  assert.match(source, /<WorkspaceGrid\s+hideMobileConsole\s+rightRail=/);
  assert.match(source, /Open Movement Ledger/);
});

test("stock balance keeps PR preparation as a flat grouped rail, not nested cards", () => {
  assert.match(source, /divide-y divide-\[var\(--sb-border-soft\)\] overflow-y-auto border-y/);
  assert.match(source, /space-y-2 py-2\.5 first:pt-0 last:pb-0/);
  assert.doesNotMatch(source, /max-h-80 space-y-2 overflow-auto rounded border p-2/);
});
