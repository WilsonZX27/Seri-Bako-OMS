const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "components", "stock-balance-workspace.tsx"), "utf8");
const stockRows = fs.readFileSync(path.join(root, "src", "components", "stock-balance-table.tsx"), "utf8");
const procurementAction = fs.readFileSync(path.join(root, "src", "server", "actions", "procurement.ts"), "utf8");
const page = fs.readFileSync(path.join(root, "src", "app", "(app)", "stock-balance", "page.tsx"), "utf8");
const inventoryQuery = fs.readFileSync(path.join(root, "src", "server", "queries", "inventory.ts"), "utf8");
const recipesQuery = fs.readFileSync(path.join(root, "src", "server", "queries", "recipes.ts"), "utf8");

test("stock balance does not duplicate mobile navigation with a generic action bar", () => {
  assert.match(source, /<WorkspaceGrid\s+className=[^\n]+\s+hideMobileConsole\s+rightRail=/);
  assert.match(source, /Open Movement Ledger/);
});

test("stock balance keeps PR preparation as a flat grouped rail, not nested cards", () => {
  assert.match(source, /divide-y divide-\[var\(--sb-border-soft\)\] overflow-y-auto border-y/);
  assert.match(source, /space-y-2 py-2\.5 first:pt-0 last:pb-0/);
  assert.doesNotMatch(source, /max-h-80 space-y-2 overflow-auto rounded border p-2/);
});

test("stock balance keeps query controls balanced and the desktop basket compact", () => {
  assert.match(source, /<FilterBar key=\{JSON\.stringify\(\[filters\.search, filters\.branch_id, filters\.status, filters\.supplier_id\]\)\} resultCount=\{totalRows\} resetHref="\/stock-balance"[\s\S]*className="sb-list-filters--balanced">/);
  assert.match(source, /aria-label="Reset filters" title="Reset filters"[\s\S]*<span className="sr-only">Reset<\/span>/);
  assert.doesNotMatch(source, /md:max-w-sm|md:max-w-xs|md:max-w-44/);
  assert.doesNotMatch(source, /Saved on this device/);
  assert.match(source, /density="dense"/);
  assert.doesNotMatch(source, /\[&_button\]|\[&_input\]/);
  assert.match(source, /SelectNative className="h-8 w-20 shrink-0/);
});

test("stock balance persists the PR basket across filter refreshes without trusting browser state", () => {
  assert.match(source, /seri-bako:stock-balance-pr-basket:v2/);
  assert.match(source, /branches\.map\(\(branch\) => branch\.id\)\.sort\(\)\.join/);
  assert.match(source, /window\.localStorage\.getItem\(basketStorageKey\)/);
  assert.match(source, /window\.localStorage\.setItem\(basketStorageKey, JSON\.stringify\(basket\)\)/);
  assert.match(source, /window\.localStorage\.removeItem\(basketStorageKey\)/);
  assert.match(source, /typeof line\.item_id === "string"/);
  assert.doesNotMatch(source, /Saved on this device/);
  assert.match(source, /createPurchaseRequestsFromBasket/);
  assert.match(procurementAction, /ensureActorCanUsePurchaseRequestBranch/);
  assert.match(source, /item_status: line\.item_status === "active" \? "active" : "unknown"/);
  assert.match(source, /inactiveRows/);
  assert.match(source, /inactiveRows\.length === 0/);
  assert.match(source, /supplierId === "unassigned" \? null : supplierId/);
  assert.match(source, /Draft PR for Purchasing to map/);
  assert.doesNotMatch(source, /createRows\.every\(\(line\) => Boolean\(line\.supplier_id\)\)/);
  assert.match(stockRows, /disabled=\{!itemActive\}/);
  assert.match(procurementAction, /supplier_id: z\.string\(\)\.uuid\("The selected supplier is invalid\."\)\.nullable\(\)/);
  assert.match(procurementAction, /Purchasing supplier mapping required/);
});

test("stock balance basket uses branch-authoritative sourcing and an editable purchase UOM", () => {
  const query = fs.readFileSync(path.join(root, "src", "server", "queries", "inventory.ts"), "utf8");
  assert.match(query, /branch_supplier_items/);
  assert.match(query, /pairMappings\.find\(\(mapping\) => mapping\.is_preferred\)/);
  assert.match(query, /const branchMappingsByPair = new Map/);
  assert.match(query, /branchMappingsByPair\.get\(`\$\{row\.branch_id\}:\$\{row\.item_id\}`\)/);
  assert.doesNotMatch(query, /\(branchMappings \?\? \[\]\)\.filter/);
  assert.match(query, /itemDefaultById\.get\(row\.item_id\)/);
  assert.match(query, /supplier_id: itemDefault\.supplier_id/);
  assert.match(query, /if \(branchMappingsError \|\| suppliersError\)/);
  assert.match(source, /Purchase UOM for/);
  assert.match(source, /function updateUom/);
  assert.match(source, /uomOptionsWithCurrent\(line\.purchase_unit \|\| line\.base_unit\)/);
  assert.match(source, /useState\(Boolean\(filters\.error\)\)/);
  assert.match(source, /your basket has been kept/);
});

test("stock balance hydrates item images into compact rows and keeps the mapped PR UOM", () => {
  const rows = fs.readFileSync(path.join(root, "src", "components", "stock-balance-table.tsx"), "utf8");

  assert.match(inventoryQuery, /const \[imageResults, branchMappingsResult\] = await Promise\.all/);
  assert.match(inventoryQuery, /Promise\.all\(itemIdChunks\.map/);
  assert.match(inventoryQuery, /for \(const images of imageResults\)/);
  assert.doesNotMatch(inventoryQuery, /for \(let offset = 0; offset < itemIds\.length; offset \+= 100\)/);
  assert.match(rows, /ItemThumbnail src=\{item\.image_url\}/);
  assert.match(source, /ItemThumbnail src=\{line\.image_url\}/);
  assert.match(source, /Purchase UOM for/);
  assert.doesNotMatch(source, /uomOptionsWithCurrent\(line\.uom\)/);
});

test("stock balance propagates stock balance query error state to UI props", () => {
  assert.match(page, /queryError={queryError}/);
  assert.match(source, /queryError:\s*string \| null/);
  assert.match(source, /queryError \?\s*\(\s*<TableBody>/);
});

test("stock balance displays empty state when query succeeds with zero rows", () => {
  assert.match(source, /queryError \?\s*\(\s*<TableBody>[\s\S]*?<ErrorState[\s\S]*?<\/TableBody>/);
  assert.match(source, /No balances match these filters/);
  assert.match(source, /No stock balances yet/);
  assert.match(source, /href: "\/stock-balance", label: "Reset filters"/);
});

test("stock balance error mode uses an explicit error component", () => {
  assert.match(source, /title="库存暂时无法加载"/);
  assert.match(source, /description={queryError}/);
});

test("stock balance query failure preserves error state instead of success values", () => {
  assert.match(inventoryQuery, /Stock Balance could not be loaded/);
  assert.match(inventoryQuery, /databasePaginationOrError<StockBalanceRow>\(\[\], 0, filters\.page, message\)/);
  assert.match(source, /queryError \|\| summaryTotal === null \? "—" : summaryTotal/);
  assert.match(source, /queryError \|\| lowStock === null \? "—" : lowStock/);
  assert.match(source, /queryError \|\| negative === null \? "—" : negative/);
  assert.match(source, /queryError \|\| totalValue === null \? "—" : formatCurrency\(totalValue\)/);
});

test("recipe stock availability fails closed when the balance view fails", () => {
  assert.match(recipesQuery, /export async function getRecipe\(id: string\)/);
  assert.match(recipesQuery, /from\("stock_balances_summary"\)/);
  assert.match(recipesQuery, /for \(const result of \[products, lines, items, packaging, snapshots, stockBalances\]\)/);
  assert.match(recipesQuery, /if \(result\.error\) throw new Error\(result\.error\.message\)/);
});
