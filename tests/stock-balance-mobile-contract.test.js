const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "components", "stock-balance-workspace.tsx"), "utf8");
const page = fs.readFileSync(path.join(root, "src", "app", "(app)", "stock-balance", "page.tsx"), "utf8");
const inventoryQuery = fs.readFileSync(path.join(root, "src", "server", "queries", "inventory.ts"), "utf8");

test("stock balance does not duplicate mobile navigation with a generic action bar", () => {
  assert.match(source, /<WorkspaceGrid\s+hideMobileConsole\s+rightRail=/);
  assert.match(source, /Open Movement Ledger/);
});

test("stock balance keeps PR preparation as a flat grouped rail, not nested cards", () => {
  assert.match(source, /divide-y divide-\[var\(--sb-border-soft\)\] overflow-y-auto border-y/);
  assert.match(source, /space-y-2 py-2\.5 first:pt-0 last:pb-0/);
  assert.doesNotMatch(source, /max-h-80 space-y-2 overflow-auto rounded border p-2/);
});

test("stock balance propagates stock balance query error state to UI props", () => {
  assert.match(page, /queryError={queryError}/);
  assert.match(source, /queryError:\s*string \| null/);
  assert.match(source, /queryError \?\s*\(\s*<TableBody>/);
});

test("stock balance displays empty state when query succeeds with zero rows", () => {
  assert.match(source, /queryError \?\s*\(\s*<TableBody>[\s\S]*?<ErrorState[\s\S]*?<\/TableBody>/);
  assert.match(source, /title="No stock balances yet" description="Balances appear after posted stock movements\."/);
});

test("stock balance error mode uses an explicit error component", () => {
  assert.match(source, /title="库存暂时无法加载"/);
  assert.match(source, /description={queryError}/);
});

test("stock balance query failure preserves error state instead of success values", () => {
  assert.match(inventoryQuery, /Stock Balance could not be loaded/);
  assert.match(inventoryQuery, /return databasePaginationOrError<StockBalanceRow>\(\[\], 0, filters\.page, message\)/);
  assert.match(source, /queryError \? "—" : totalRows/);
  assert.match(source, /queryError \? "—" : lowStock/);
  assert.match(source, /queryError \? "—" : negative/);
});
