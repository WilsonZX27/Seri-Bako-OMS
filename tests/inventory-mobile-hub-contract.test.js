const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "app", "(app)", "inventory", "page.tsx"),
  "utf8",
);

test("inventory uses a phone-only operational hub and preserves the desktop workspace", () => {
  assert.match(source, /<div className="md:hidden">\s*<OperationalHub/);
  assert.match(source, /<OperationalOverview/);
  assert.match(source, /<OperationalActionGrid/);
  assert.match(fs.readFileSync("src/components/workspace/operational-sections.tsx","utf8"), /hidden overflow-hidden.*md:block/);
  assert.match(source, /<WorkspaceGrid[\s\S]*?rightRail=/);
});

test("inventory phone layout remains permission-aware and bottom-nav safe", () => {
  assert.match(source, /const visibleModules = modules\.filter/);
  assert.match(source, /tools=\{visibleModules\.map/);
  assert.match(source, /pb-24 md:pb-0/);
});

test("inventory does not duplicate the global More navigation with an empty action bar", () => {
  assert.match(source, /<WorkspaceGrid className="p-3 sm:p-5" hideMobileConsole rightRail=/);
});

test("inventory analysis remains available below the mobile hub", () => {
  assert.match(source, /<h2 className="text-sm font-semibold">Low Stock<\/h2>/);
  assert.match(source, /<h2 className="text-sm font-semibold">Consumption<\/h2>/);
  assert.match(source, /Top Purchased Items/);
});
