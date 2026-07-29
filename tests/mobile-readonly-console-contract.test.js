const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const readOnlyWorkspaces = [
  "src/app/(app)/production/planning/page.tsx",
  "src/app/(app)/production/variance/page.tsx",
  "src/app/(app)/reports/costing-readiness/page.tsx",
  "src/app/(app)/reports/demand-trends/page.tsx",
  "src/app/(app)/reports/procurement-variance/page.tsx",
  "src/app/(app)/reports/product-margin/page.tsx",
  "src/app/(app)/reports/recipe-costing/page.tsx",
  "src/app/(app)/supplier-invoices/aging/page.tsx",
  "src/app/(app)/supplier-invoices/cash-flow/page.tsx",
];

test("read-only workspaces do not create a competing mobile action bar", () => {
  for (const file of readOnlyWorkspaces) {
    const source = read(file);
    assert.match(source, /<WorkspaceGrid/, file);
    assert.match(source, /hideMobileConsole/, file);
    assert.match(source, /rightRail=/, file);
  }
});

test("the report directory keeps its desktop summary out of the phone action surface", () => {
  assert.match(read("src/app/(app)/reports/page.tsx"), /<WorkspaceGrid\s+hideMobileConsole\s+rightRail=/);
});

test("AP aging keeps its CSV export reachable without restoring a generic action bar", () => {
  const aging = read("src/app/(app)/supplier-invoices/aging/page.tsx");

  assert.match(aging, /<WorkspaceGrid hideMobileConsole rightRail=/);
  assert.match(aging, /aria-label="AP aging actions"/);
  assert.match(aging, /\/api\/export\/ap-aging/);
});
