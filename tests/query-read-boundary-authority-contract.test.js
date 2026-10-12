import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const common = readFileSync("src/server/queries/common.ts", "utf8");
const modules = [
  "src/server/queries/outlet-daily-records.ts",
  "src/server/queries/products.ts",
  "src/server/queries/production-jobs.ts",
  "src/server/queries/recipes.ts",
  "src/server/queries/purchase-returns.ts",
  "src/server/queries/stock-operations.ts",
  "src/server/queries/product-margin.ts",
  "src/server/queries/costing-readiness.ts",
  "src/server/queries/procurement-variance.ts",
  "src/server/queries/recipe-costing.ts",
].map((path) => ({ path, source: readFileSync(path, "utf8") }));

test("shared read-boundary helpers define the only null-payload policy", () => {
  assert.match(common, /export function requireReadRows<T>/);
  assert.match(common, /if \(data == null\) throw new Error/);
  assert.match(common, /export function requireReadCount/);
  assert.match(common, /if \(count == null\) throw new Error/);
});

test("primary operational query modules opt into fail-closed read boundaries", () => {
  for (const { path, source } of modules) {
    assert.match(source, /requireReadRows/, `${path} must use the shared row boundary`);
  }
});

test("primary lists do not silently turn a null payload into an empty result", () => {
  const sourceByPath = Object.fromEntries(modules.map(({ path, source }) => [path, source]));
  assert.doesNotMatch(sourceByPath["src/server/queries/products.ts"], /return filterProducts\(data \?\? \[\]/);
  assert.doesNotMatch(sourceByPath["src/server/queries/production-jobs.ts"], /const productionRows = \(data \?\? \[\]\)/);
  assert.doesNotMatch(sourceByPath["src/server/queries/outlet-daily-records.ts"], /hydrateRows\(db, \(data \?\? \[\]\)/);
});

test("dashboard never turns a failed secondary inventory read into zero", () => {
  const dashboard = readFileSync("src/server/queries/dashboard.ts", "utf8");
  assert.match(dashboard, /inventoryUnavailable = needsInventory && \(coreUnavailable \|\| fallbackUnavailable\.inventory \|\| lowStockViewUnavailable\)/);
  assert.match(dashboard, /lowStockCount: inventoryUnavailable \? null/);
  assert.match(dashboard, /totalStockValue: inventoryUnavailable \? null/);
  assert.doesNotMatch(dashboard, /lowStockViewUnavailable[\s\S]{0,120}lowStockCount: inventoryUnavailable \? 0/);
});

test("inventory dashboard rejects incomplete RPC payloads before numeric coercion", () => {
  const inventory = readFileSync("src/server/queries/inventory.ts", "utf8");
  assert.match(inventory, /function isCompleteInventoryDashboardRpc\(value: unknown\)/);
  assert.match(inventory, /INVENTORY_DASHBOARD_NUMERIC_FIELDS\.every\(hasFiniteNumber\)/);
  assert.match(inventory, /if \(!isCompleteInventoryDashboardRpc\(data\)\)/);
  assert.match(inventory, /dashboard summary incomplete payload/);
});

test("report read boundaries reject incomplete payloads instead of rendering empty or zero", () => {
  const sourceByPath = Object.fromEntries(modules.map(({ path, source }) => [path, source]));
  const apAging = readFileSync("src/server/queries/ap-aging.ts", "utf8");
  assert.match(apAging, /isApAgingReport/);
  assert.match(apAging, /AP Aging RPC returned an incomplete payload/);
  for (const path of [
    "src/server/queries/product-margin.ts",
    "src/server/queries/costing-readiness.ts",
    "src/server/queries/procurement-variance.ts",
    "src/server/queries/recipe-costing.ts",
  ]) {
    assert.match(sourceByPath[path], /requireReadRows/, `${path} must reject null query data`);
    assert.doesNotMatch(sourceByPath[path], /data \?\? \[\]/, `${path} must not silently convert null data to []`);
  }
  const transactions = readFileSync("src/app/(app)/stock-transactions/page.tsx", "utf8");
  assert.match(transactions, /const balanceSummary = balanceSummaryResult\.status === "fulfilled" \? balanceSummaryResult\.value : null/);
  assert.match(transactions, /balanceSummary \? balanceSummary\.total : "Unavailable"/);
  assert.match(transactions, /balanceSummary \? formatCurrency\(balanceSummary\.inventoryValue\) : "Unavailable"/);
});

test("list filters have a single final responsive authority", () => {
  const css = readFileSync("src/app/design-system-v2.css", "utf8");
  assert.match(css, /Final shared list-control authority/);
  assert.match(css, /grid-column: 1 \/ -1/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) auto/);
  assert.match(css, /flex: 0 0 10rem !important/);
});

test("bounded inventory opening balances use the daily summary instead of an unbounded history scan", () => {
  const migration = readFileSync("supabase/migrations/155_bounded_inventory_opening_from_daily_summary.sql", "utf8");
  assert.match(migration, /inventory_daily_summary/);
  assert.match(migration, /inventory_daily_summary_date_branch_item_idx/);
  assert.match(migration, /d\.transaction_date < p_from/);
  assert.match(migration, /st\.transaction_date between p_from and p_to/);
  assert.match(migration, /period_rows/);
  assert.match(migration, /sum\(p\.quantity_in - p\.quantity_out\) over/);
  assert.doesNotMatch(migration, /with expanded as[\s\S]*scoped as[\s\S]*where transaction_date < p_from/);
});
