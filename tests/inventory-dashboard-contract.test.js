const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("inventory dashboard uses the implemented stock rules", () => {
  const query = read("src/server/queries/inventory.ts");
  assert.match(query, /getLowStockItems/);
  assert.match(query, /current_qty.*safety_stock/);
  assert.match(query, /production_usage/);
  assert.match(query, /period.*7d/);
  assert.match(query, /period.*30d/);
  assert.match(query, /period.*month/);
});

test("inventory keeps its action and quick insights in the shared right console", () => {
  const page = read("src/app/(app)/inventory/page.tsx");
  assert.match(page, /WorkspaceGrid/);
  assert.match(page, /ConsoleSection title="Quick Actions"/);
  assert.match(page, /ConsoleSection title="Quick Insights"/);
  assert.match(page, /href="\/stock-transactions\/new"/);
  assert.doesNotMatch(page, /inventory-insights-rail/);
});

test("all configured imports use the shared import workspace", () => {
  const config = read("src/lib/imports/config.ts");
  const page = read("src/app/(app)/imports/[entity]/page.tsx");
  assert.match(config, /export const importEntities/);
  assert.match(page, /ImportWorkflow/);
  for (const entity of ["items", "branches", "staff", "products", "suppliers", "supplier-items", "uom-conversions", "opening-stock"]) assert.match(config, new RegExp(`['\"]${entity}['\"]`));
});
