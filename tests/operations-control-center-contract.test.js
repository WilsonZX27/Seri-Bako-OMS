const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const dashboard = read("src/server/queries/dashboard.ts");
const outlet = read("src/server/queries/outlet-daily-records.ts");
const workspace = read("src/components/dashboard-workspace.tsx");

test("Operations Control Center reuses existing outlet and demand query sources", () => {
  assert.match(dashboard, /getOperationsControlCenterSummary/);
  assert.match(outlet, /Promise\.allSettled\(\[getOutletDailyRecords\(\), getOutletDailyDemandTrend\(\{ period: "7" \}\)\]\)/);
  assert.match(outlet, /buildProductionDemandVariance\(trend\)/);
  assert.match(outlet, /buildProductionPlanning\(trend\)/);
});

test("Operations Control Center isolates outlet and demand failures", () => {
  assert.match(outlet, /unavailable: \{ outlet: !outlet, demand: !trend \}/);
  assert.match(dashboard, /Operations control summaries unavailable; rendering the remaining dashboard/);
  assert.match(workspace, /Outlet record health is unavailable right now/);
  assert.match(workspace, /Demand confidence is unavailable right now/);
  assert.match(workspace, /Variance signals are unavailable right now/);
  assert.match(workspace, /Planning reference is unavailable right now/);
});

test("Operations Control Center surfaces health, confidence, variance, planning, stock and AP read-only summaries", () => {
  assert.match(workspace, /Outlet Record Health/);
  assert.match(workspace, /Demand Confidence/);
  assert.match(workspace, /Wastage and Variance/);
  assert.match(workspace, /Production Planning Reference/);
  assert.match(workspace, /Stock Exceptions/);
  assert.match(workspace, /Finance \/ Payables Attention/);
  assert.match(workspace, /Open Cash Flow Forecast/);
  assert.match(workspace, /Planning values are references, not production orders/);
});

test("Operations Control Center stays read-only and follows the Sprint 7.16 footer", () => {
  const version = read("src/lib/app-version.ts");
  const implementation = `${dashboard}\n${outlet}`;
  assert.doesNotMatch(implementation, /(insert into|update|delete from) public\.(stock_transactions|stock_transaction_lines|stock_balances|production_jobs|supplier_invoices|supplier_invoice_payments)/i);
  assert.equal(fs.readdirSync("supabase/migrations").some((file) => file.startsWith("066_")), false);
  assert.match(version, /APP_VERSION = "0\.2\.24"/);
  assert.match(version, /APP_SPRINT = "Sprint 7\.16"/);
});
