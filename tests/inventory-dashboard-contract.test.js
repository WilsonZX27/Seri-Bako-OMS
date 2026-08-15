const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("inventory dashboard uses the implemented stock rules", () => {
  const query = read("src/server/queries/inventory.ts");
  assert.match(query, /getLowStockItems/);
  assert.match(query, /get_inventory_dashboard_summary/);
  assert.match(query, /p_period/);
  assert.match(query, /boundedInventoryInsight/);
  assert.match(query, /inventoryUnavailable/);
  assert.match(query, /low_stock_rows/);
});

test("inventory daily movement insight is bounded, unit-safe, and based on the daily read model", () => {
  const migration = read("supabase/migrations/148_inventory_daily_movement_insight.sql");
  const query = read("src/server/queries/inventory.ts");
  const page = read("src/app/(app)/inventory/page.tsx");
  const chart = read("src/components/reports/inventory-daily-movement-chart.tsx");

  assert.match(migration, /get_inventory_daily_movement_summary/);
  assert.match(migration, /from public\.inventory_daily_summary/);
  assert.match(migration, /report_date - 6/);
  assert.match(migration, /report_date - 29/);
  assert.match(migration, /Asia\/Kuala_Lumpur/);
  assert.match(migration, /sum\(d\.movement_count\) filter \(where d\.quantity_in > 0\)/);
  assert.match(migration, /sum\(d\.movement_count\) filter \(where d\.quantity_out > 0\)/);
  assert.doesNotMatch(migration, /from public\.stock_transactions/);
  assert.doesNotMatch(migration, /sum\(d\.quantity_(?:in|out)\)/);
  assert.match(query, /get_inventory_daily_movement_summary/);
  assert.match(query, /daily movement summary/);
  assert.match(page, /Counts are posted entries, not quantities mixed across different UOMs/);
  assert.match(page, /<InventoryDailyMovementChart points=\{movement\.rows\}/);
  assert.match(page, /collapseToolsOnPhone/);
  assert.match(read("src/components/operational-hub.tsx"), /Inventory tools|collapseToolsOnPhone/);
  assert.match(chart, /onPointerMove/);
  assert.match(chart, /ArrowLeft/);
  assert.match(chart, /Open inbound/);
  assert.match(chart, /Open outbound/);
  assert.match(chart, /Daily data/);
  assert.match(chart, /data-inventory-movement-daily-list/);
  assert.match(chart, /role="list" aria-label="Daily posted inventory movement entries"/);
  assert.match(chart, /className="hidden w-full text-left sm:table"/);
  assert.doesNotMatch(chart, /min-w-\[24rem\]|overflow-x-auto/);
});

test("inventory dashboard fallback keeps balance hydration bounded and fails closed when truncated", () => {
  const query = read("src/server/queries/inventory.ts");

  assert.match(query, /MAX_INVENTORY_DASHBOARD_FALLBACK_BALANCES/);
  assert.match(query, /\.limit\(MAX_INVENTORY_DASHBOARD_FALLBACK_BALANCES \+ 1\)/);
  assert.match(query, /fallbackBalancesTruncated/);
  assert.match(query, /inventory: Boolean\(balancesResult\.error \|\| fallbackBalancesTruncated\)/);
  assert.doesNotMatch(query, /from\("stock_balances_summary"\)\.select\("\*"\)\.order\("item_name"/);
});

test("inventory keeps a role-aware attention summary and control context in the shared right console", () => {
  const page = read("src/app/(app)/inventory/page.tsx");
  assert.match(page, /WorkspaceGrid/);
  assert.match(page, /ConsoleSection title="Attention summary"/);
  assert.match(page, /ConsoleSection title="Control basis"/);
  assert.match(page, /href="\/low-stock"/);
  assert.match(page, /permissions\[counter\.permission\]/);
  assert.doesNotMatch(page, /inventory-insights-rail/);
});

test("all configured imports use the shared import workspace", () => {
  const config = read("src/lib/imports/config.ts");
  const page = read("src/app/(app)/imports/[entity]/page.tsx");
  assert.match(config, /export const importEntities/);
  assert.match(page, /ImportWorkflow/);
  for (const entity of ["items", "branches", "staff", "products", "suppliers", "supplier-items", "uom-conversions", "opening-stock"]) assert.match(config, new RegExp(`['\"]${entity}['\"]`));
});
