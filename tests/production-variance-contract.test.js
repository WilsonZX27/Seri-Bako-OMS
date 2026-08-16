const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const query = read("src/server/queries/outlet-daily-records.ts");
const page = read("src/app/(app)/production/variance/page.tsx");

test("Production variance reuses reliable outlet movement without changing its formula", () => {
  assert.match(query, /getProductionDemandVariance[\s\S]*getOutletDailyDemandTrend\(filters\)/);
  assert.match(query, /Math\.max\(received - leftover - wastage, 0\)/);
  assert.match(query, /leftover_percent = row\.received > 0 \? \(row\.leftover \/ row\.received\) \* 100 : 0/);
  assert.match(query, /wastage_percent: wastagePercent/);
  assert.match(query, /\["draft", "morning_recorded"\]/);
});

test("Production variance classifies supply signals conservatively", () => {
  assert.match(query, /leftover_percent >= 20 \|\| row\.wastage_percent >= 10/);
  assert.match(query, /row\.movement > 0 && leftover_percent <= 5/);
  assert.match(query, /trend\.coverage\.confidence === "Low" \|\| row\.low_sample/);
  assert.match(query, /"review_manual"/);
  assert.match(page, /Under-supply is a low-leftover movement signal, not a production shortfall/);
});

test("Production variance visual compares signal counts without inventing a cross-UOM magnitude", () => {
  const chart = read("src/components/reports/production-variance-signal-chart.tsx");
  assert.match(query, /const all_rows = trend\.product_outlets\.map/);
  assert.match(query, /const rows = all_rows\.filter/);
  assert.match(page, /rows=\{report\.variance\.all_rows\}/);
  assert.match(page, /className="divide-y xl:hidden" data-production-variance-list/);
  assert.match(chart, /Bar length compares row counts, never quantities across unlike UOMs/);
  assert.match(chart, /Under- and over-supply signal count comparison/);
  assert.match(chart, /onMouseEnter/);
  assert.match(chart, /onFocus/);
  assert.match(chart, /aria-live="polite"/);
  assert.match(chart, /data-production-signal-preview/);
  assert.match(chart, /min-h-\[3\.75rem\][\s\S]*border/);
  assert.match(chart, /rounded-\[var\(--sb-radius-control\)\]/);
  assert.match(chart, /data-production-signal-option/);
  assert.match(chart, /data-production-signal-open/);
  assert.match(chart, /aria-pressed/);
  assert.match(chart, /min-h-11[\s\S]*xl:min-h-9/);
  assert.match(chart, /bg-\[var\(--sb-danger\)\]/);
  assert.match(chart, /bg-\[var\(--sb-warning\)\]/);
  assert.doesNotMatch(chart, /(?:bg|text|border)-(?:rose|amber)-\d/);
  assert.doesNotMatch(chart, /<Link href=\{filterHref\(searchParams, "(?:under|over)_supplied"\)\}/);
  assert.doesNotMatch(chart, /received\s*[-+\/]\s*(movement|leftover|wastage)/);
});

test("Production variance remains read-only and avoids a production-job comparison", () => {
  assert.doesNotMatch(query, /(insert into|update|delete from) public\.(production_jobs|stock_transactions|stock_transaction_lines|stock_balances|supplier_invoices|supplier_invoice_payments)/i);
  assert.match(page, /Production job comparison is not included without a reliable posted-output join/);
  assert.match(read("supabase/migrations/066_create_outlet_staff_role.sql"), /outlet_staff/);
});

test("Production variance has one protected route and the current footer", () => {
  const routes = read("src/server/auth/route-permissions.ts");
  const production = read("src/app/(app)/production/page.tsx");
  const version = read("src/lib/app-version.ts");
  assert.match(routes, /"\/production\/variance": \["outlet_daily_record\.view"\]/);
  assert.match(production, /\/production\/variance/);
  assert.match(version, /APP_VERSION = "\d+\.\d+\.\d+"/);
  assert.match(version, /APP_SPRINT = `v\$\{APP_VERSION\}`/);
  assert.match(page, /<FilterBar resultCount=\{report\.variance\.rows\.length\} resetHref="\/production\/variance" filtered=\{filtered\}>/);
  assert.match(page, /<SelectControl name="signal"/);
});
