const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const query = read("src/server/queries/outlet-daily-records.ts");
const page = read("src/app/(app)/reports/demand-trends/page.tsx");

test("Demand Trend Lite uses only reliable outlet daily records", () => {
  assert.match(query, /\["evening_completed", "reviewed"\]\.includes\(record\.status\)/);
  assert.match(query, /\["draft", "morning_recorded"\]\.includes\(record\.status\)/);
  assert.match(page, /incomplete record\(s\).*missing outlet-day/s);
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

test("release footer matches Sprint 7.13 without migration 066", () => {
  const version = read("src/lib/app-version.ts");
  assert.match(version, /APP_VERSION = "0\.2\.21"/);
  assert.match(version, /APP_SPRINT = "Sprint 7\.13"/);
  assert.equal(fs.readdirSync("supabase/migrations").some((file) => file.startsWith("066_")), false);
});
