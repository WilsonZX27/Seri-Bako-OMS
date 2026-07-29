const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("master-data lists reserve phone action space for creation, not desktop-only utilities", () => {
  const items = read("src/app/(app)/items/page.tsx");
  assert.match(items, /<WorkspaceGrid[^>]*hideMobileConsole=\{!permissions\["items\.create"\]\}/);
  assert.match(items, /<WorkspaceGrid[^>]*tabletRailMode="split"/);
  assert.match(items, /<WorkspaceGrid[^>]*rightRail=/);
  assert.match(read("src/app/(app)/suppliers/page.tsx"), /hideMobileConsole=\{!canCreate\}/);
  assert.match(read("src/app/(app)/products/page.tsx"), /<WorkspaceGrid hideMobileConsole=\{!canCreate\} rightRail=/);
  assert.match(read("src/app/(app)/supplier-items/page.tsx"), /<WorkspaceGrid hideMobileConsole=\{!canCreate\} rightRail=/);
});

test("low stock keeps its inline PR workspace clear of a redundant phone action bar", () => {
  const lowStock = read("src/app/(app)/low-stock/page.tsx");

  assert.match(lowStock, /<WorkspaceGrid\s+tabletRailMode="split"\s+tabletRailBreakpoint="lg"\s+hideMobileConsole\s+rightRail=/);
  assert.match(lowStock, /<LowStockPrForm/);
});
