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

test("low stock owns one shared responsive basket rail and no duplicate inline banner", () => {
 const page=read("src/app/(app)/low-stock/page.tsx"), form=read("src/components/low-stock-pr-form.tsx");
 assert.match(page,/<LowStockPrForm/);assert.doesNotMatch(page,/<WorkspaceGrid/);
 assert.match(form,/<WorkspaceGrid tabletRailMode="split" tabletRailBreakpoint="lg"/);
 assert.match(form,/hideMobileConsole mobileRailSummary=/);
 assert.equal((form.match(/ConsoleSection title="PR basket"/g)||[]).length,1);
});
