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
