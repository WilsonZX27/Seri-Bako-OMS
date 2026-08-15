const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "components", "stock-balance-workspace.tsx"), "utf8");
const procurementAction = fs.readFileSync(path.join(root, "src", "server", "actions", "procurement.ts"), "utf8");
const page = fs.readFileSync(path.join(root, "src", "app", "(app)", "stock-balance", "page.tsx"), "utf8");
const inventoryQuery = fs.readFileSync(path.join(root, "src", "server", "queries", "inventory.ts"), "utf8");
const recipesQuery = fs.readFileSync(path.join(root, "src", "server", "queries", "recipes.ts"), "utf8");

test("stock balance does not duplicate mobile navigation with a generic action bar", () => {
  assert.match(source, /<WorkspaceGrid\s+hideMobileConsole\s+rightRail=/);
  assert.match(source, /Open Movement Ledger/);
});

test("stock balance keeps PR preparation as a flat grouped rail, not nested cards", () => {
  assert.match(source, /divide-y divide-\[var\(--sb-border-soft\)\] overflow-y-auto border-y/);
  assert.match(source, /space-y-2 py-2\.5 first:pt-0 last:pb-0/);
  assert.doesNotMatch(source, /max-h-80 space-y-2 overflow-auto rounded border p-2/);
});

test("stock balance persists the PR basket across filter refreshes without trusting browser state", () => {
  assert.match(source, /seri-bako:stock-balance-pr-basket:v1/);
  assert.match(source, /branches\.map\(\(branch\) => branch\.id\)\.sort\(\)\.join/);
  assert.match(source, /window\.localStorage\.getItem\(basketStorageKey\)/);
  assert.match(source, /window\.localStorage\.setItem\(basketStorageKey, JSON\.stringify\(basket\)\)/);
  assert.match(source, /window\.localStorage\.removeItem\(basketStorageKey\)/);
  assert.match(source, /typeof line\.item_id === "string"/);
  assert.match(source, /Saved on this device/);
  assert.match(source, /createPurchaseRequestsFromBasket/);
  assert.match(procurementAction, /ensureActorCanUsePurchaseRequestBranch/);
});

test("stock balance hydrates item images into compact rows and keeps common PR UOM choices", () => {
  const rows = fs.readFileSync(path.join(root, "src", "components", "stock-balance-table.tsx"), "utf8");

  assert.match(inventoryQuery, /from\("items"\)\.select\("id, item_image_url"\)\.in\("id", itemIds\)/);
  assert.match(rows, /ItemThumbnail src=\{item\.image_url\}/);
  assert.match(source, /ItemThumbnail src=\{line\.image_url\}/);
  assert.match(source, /uomOptionsWithCurrent\(line\.uom\)/);
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

test("recipe stock availability fails closed when the balance view fails", () => {
  assert.match(recipesQuery, /export async function getRecipe\(id: string\)/);
  assert.match(recipesQuery, /from\("stock_balances_summary"\)/);
  assert.match(recipesQuery, /for \(const result of \[products, lines, items, packaging, snapshots, stockBalances\]\)/);
  assert.match(recipesQuery, /if \(result\.error\) throw new Error\(result\.error\.message\)/);
});
