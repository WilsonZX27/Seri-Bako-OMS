const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const query = read("src/server/queries/outlet-daily-records.ts");
const page = read("src/app/(app)/reports/demand-trends/page.tsx");

test("Demand Trend Lite separates incomplete records from reliable totals", () => {
  assert.match(query, /\["evening_completed", "reviewed"\]\.includes\(record\.status\)/);
  assert.match(query, /\["draft", "morning_recorded"\]\.includes\(record\.status\)/);
  assert.match(page, /incomplete record\(s\).*missing outlet-day/s);
  assert.match(page, /Use with caution/);
});

test("Demand Trend Lite exposes coverage confidence and reliability cues", () => {
  assert.match(query, /coveragePercent >= 80 \? "High" : coveragePercent >= 50 \? "Medium" : "Low"/);
  assert.match(query, /completed_records: productRecordIds\.get\(row\.id\)\?\.size/);
  assert.match(query, /low_sample: \(productRecordIds\.get\(row\.id\)\?\.size \?\? 0\) < 3/);
  assert.match(query, /no_completed_records: completed_records === 0/);
  assert.match(page, /Low sample/);
  assert.match(page, /No completed records in this range/);
});

test("Demand Trend Lite calculates movement and wastage from outlet lines only", () => {
  assert.match(query, /Math\.max\(received - leftover - wastage, 0\)/);
  assert.match(query, /totals\.received > 0 \? \(totals\.wastage \/ totals\.received\) \* 100 : 0/);
  assert.match(query, /from\("outlet_daily_records"\)/);
  assert.match(query, /from\("outlet_daily_record_lines"\)/);
  assert.doesNotMatch(query, /(insert into|update|delete from) public\.(stock_transactions|stock_transaction_lines|stock_balances|production_jobs|supplier_invoices)/i);
});

test("Demand Trend Lite applies date, outlet, product and reliable-status filters", () => {
  assert.match(query, /\["7", "30", "month"\]/);
  assert.match(query, /filters\.branch/);
  assert.match(query, /filters\.product/);
  assert.match(query, /filters\.status/);
  assert.match(page, /Last 7 days/);
  assert.match(page, /All available outlets/);
  assert.match(page, /Completed \+ reviewed/);
});

test("Demand Trend Lite has one report route and inherits outlet-record access", () => {
  const routes = read("src/server/auth/route-permissions.ts");
  const reports = read("src/app/(app)/reports/page.tsx");
  assert.equal(fs.existsSync("src/app/(app)/reports/demand-trends/page.tsx"), true);
  assert.match(routes, /"\/reports\/demand-trends": \["outlet_daily_record\.view"\]/);
  assert.match(reports, /\/reports\/demand-trends/);
  assert.match(query, /hasPermission\("outlet_daily_record\.view"\)/);
});

test("release footer matches the current sprint with the scoped Outlet Staff seed", () => {
  const version = read("src/lib/app-version.ts");
  assert.match(version, /APP_VERSION = "0\.2\.32"/);
  assert.match(version, /APP_SPRINT = "Sprint 7\.21\.6"/);
  assert.match(read("supabase/migrations/066_create_outlet_staff_role.sql"), /outlet_staff/);
});
