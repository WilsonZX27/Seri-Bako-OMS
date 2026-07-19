const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const query = read("src/server/queries/outlet-daily-records.ts");
const page = read("src/app/(app)/production/planning/page.tsx");

test("Production Planning Lite reuses reliable demand movement and rounds its suggestion", () => {
  assert.match(query, /getProductionPlanning[\s\S]*getOutletDailyDemandTrend\(filters\)/);
  assert.match(query, /movement \/ trend\.coverage\.completed/);
  assert.match(query, /average_daily_movement \* target_days \* \(1 \+ buffer_percent \/ 100\)/);
  assert.match(query, /Math\.ceil\(calculated \/ rounding_unit\) \* rounding_unit/);
  assert.match(query, /planningNumber\(filters\.buffer_percent, 10/);
  assert.match(query, /planningNumber\(filters\.rounding_unit, 1/);
  assert.match(query, /planningNumber\(filters\.target_days, 1, 1, 30\)/);
  assert.match(page, /Target: 1 day/);
  assert.match(page, /Buffer %/);
  assert.match(page, /Round to/);
});

test("Production Planning Lite makes weak data manual review and warns on medium confidence", () => {
  assert.match(query, /trend\.coverage\.confidence === "Low" \|\| product\.low_sample/);
  assert.match(query, /"Review manually"/);
  assert.match(query, /"Suggested — check data"/);
  assert.match(page, /Low sample/);
  assert.match(page, /Medium · Caution/);
  assert.match(page, /Suggestions are planning references, not production orders/);
  assert.match(page, /Open Demand Trends/);
});

test("Production Planning Lite has no production, stock, AP or cash-flow write path", () => {
  assert.doesNotMatch(query, /(insert into|update|delete from) public\.(production_jobs|stock_transactions|stock_transaction_lines|stock_balances|supplier_invoices|supplier_invoice_payments)/i);
  assert.match(page, /does not create production jobs or inventory writes/i);
  assert.match(read("supabase/migrations/066_create_outlet_staff_role.sql"), /outlet_staff/);
});

test("Production Planning Lite is route-protected and follows the current footer", () => {
  const routes = read("src/server/auth/route-permissions.ts");
  const production = read("src/app/(app)/production/page.tsx");
  const version = read("src/lib/app-version.ts");
  assert.match(routes, /"\/production\/planning": \["outlet_daily_record\.view"\]/);
  assert.match(production, /\/production\/planning/);
  assert.match(version, /APP_VERSION = "0\.2\.37"/);
  assert.match(version, /APP_SPRINT = "Sprint 7\.23\.5\.1"/);
});
