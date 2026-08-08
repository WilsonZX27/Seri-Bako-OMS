const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const dashboard = read("src/server/queries/dashboard.ts");
const outlet = read("src/server/queries/outlet-daily-records.ts");
const workspace = read("src/components/dashboard-workspace.tsx");

test("Operations Control Center reuses existing outlet and demand query sources", () => {
  assert.match(dashboard, /get_dashboard_core_snapshot/);
  assert.match(dashboard, /outlet_daily_records/);
  assert.match(outlet, /getOutletDailyRecords/);
  assert.match(outlet, /getOutletDailyDemandTrend/);
});

test("Operations Control Center isolates outlet and demand failures", () => {
  assert.match(dashboard, /warnOptionalQueryResult\("core snapshot", coreSnapshotResult\)/);
  assert.match(dashboard, /const coreUnavailable =/);
  assert.match(dashboard, /todayReceivingUnavailable: coreUnavailable/);
  assert.match(dashboard, /dashboard\.optional\.\$\{name\}/);
  assert.match(workspace, /No urgent operational exceptions are visible in your scope/);
});

test("Operations Control Center surfaces health, confidence, variance, planning, stock and AP read-only summaries", () => {
  assert.match(workspace, /Outlet completion issues/);
  assert.match(workspace, /Production exceptions/);
  assert.match(workspace, /Low stock/);
  assert.match(workspace, /Payables and cash obligations/);
  assert.match(workspace, /View Cash Flow/);
});

test("Operations Control Center stays read-only and follows the Sprint 7.18.1 footer", () => {
  const version = read("src/lib/app-version.ts");
  const implementation = `${dashboard}\n${outlet}`;
  assert.doesNotMatch(implementation, /(insert into|update|delete from) public\.(stock_transactions|stock_transaction_lines|stock_balances|production_jobs|supplier_invoices|supplier_invoice_payments)/i);
  assert.match(read("supabase/migrations/066_create_outlet_staff_role.sql"), /outlet_staff/);
  assert.match(version, /APP_VERSION = "\d+\.\d+\.\d+"/);
  assert.match(version, /APP_SPRINT = `v\$\{APP_VERSION\}`/);
});
