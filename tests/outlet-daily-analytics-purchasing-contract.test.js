const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src", "app", "(app)", "outlet-daily-records", "page.tsx"), "utf8");
const chart = fs.readFileSync(path.join(root, "src", "components", "outlet-daily-wastage-chart.tsx"), "utf8");
const interactiveChart = fs.readFileSync(path.join(root, "src", "components", "ui", "interactive-line-chart.tsx"), "utf8");
const permissions = fs.readFileSync(path.join(root, "src", "server", "auth", "permissions.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "147_purchasing_manage_outlet_daily_records.sql"), "utf8");
const stockScopeMigration = fs.readFileSync(path.join(root, "supabase", "migrations", "144_reconcile_pjs10_12_aug_stock_scope.sql"), "utf8");
const outletQuery = fs.readFileSync(path.join(root, "src", "server", "queries", "outlet-daily-records.ts"), "utf8");
const demandPage = fs.readFileSync(path.join(root, "src", "app", "(app)", "reports", "demand-trends", "page.tsx"), "utf8");
const planningPage = fs.readFileSync(path.join(root, "src", "app", "(app)", "production", "planning", "page.tsx"), "utf8");

test("outlet daily workspace renders a seven-day trend aligned to Calendar history", () => {
  assert.match(page, /getOutletDailyDemandTrend\(\{ period: "7", branch: filters\.branch, history_date: filters\.history_date \}\)/);
  assert.match(page, /<OutletDailyWastageChart points=\{trend\?\.daily \?\? \[\]\} branch=\{filters\.branch\} unavailable=\{!trend\} \/>/);
  assert.match(chart, /Matches Calendar history · completed records only/);
  assert.match(chart, /7-day wastage rate/);
  assert.match(chart, /totalWastage \/ totalReceived \* 100/);
  assert.match(chart, /InteractiveLineChart/);
  assert.match(chart, /maximumFractionDigits: 1/);
  assert.match(chart, /left: 54/);
  assert.match(chart, /Daily wastage rate data/);
  assert.match(chart, /data-outlet-wastage-daily-list/);
  assert.match(chart, /role="list" aria-label="Daily wastage rate data"/);
  assert.match(chart, /className="hidden w-full text-left sm:table"/);
  assert.match(chart, /xl:grid-cols-\[minmax\(0,3fr\)_minmax\(18rem,2fr\)\]/);
  assert.match(chart, /\[&>svg\]:h-full/);
  assert.doesNotMatch(chart, /Hover or focus the chart/);
  assert.doesNotMatch(chart, /<details className="mt-2/);
  assert.match(interactiveChart, /strokeWidth="1\.5"/);
  assert.match(chart, /new URLSearchParams\(\{ date \}\)/);
  assert.match(chart, /query\.set\("branch", branch\)/);
  assert.doesNotMatch(chart, /<table className="sr-only">|overflow-x-auto/);
  assert.match(interactiveChart, /"use client"/);
  assert.match(interactiveChart, /<svg/);
  assert.match(interactiveChart, /data-chart-preview/);
  assert.match(interactiveChart, /onPointerMove/);
  assert.match(interactiveChart, /ArrowLeft/);
  assert.match(interactiveChart, /ArrowRight/);
  assert.match(interactiveChart, /touch-pan-y/);
  assert.doesNotMatch(chart + interactiveChart, /recharts|chart\.js|d3/);
  assert.match(outletQuery, /trendDateRange\(period, filters\.history_date\)/);
  assert.match(outletQuery, /filter\(\(row\) => row\.received > 0\)/);
});

test("purchasing can inspect and correct company outlet daily records without bypassing RLS", () => {
  const required = ["view", "view_all", "update", "qty_sent"];
  for (const action of required) {
    const code = `outlet_daily_record.${action}`;
    assert.match(permissions, new RegExp(`"${code.replace(".", "\\.")}"`));
    assert.match(migration, new RegExp(`'${code.replace(".", "\\.")}'`));
  }
  assert.match(migration, /r\.role_code = 'purchasing'/);
  assert.match(migration, /r\.company_id is not null/);
  assert.match(migration, /on conflict \(role_id, permission_id\) do nothing/);
  assert.doesNotMatch(migration, /outlet_daily_record\.create/);
  assert.doesNotMatch(migration, /alter table|disable row level security|security definer/i);
});

test("optional CK-PJS10 reconciliation cannot block later release migrations", () => {
  assert.match(stockScopeMigration, /CK-PJS10 branch was not found; 12 Aug stock scope reconciliation was skipped\./);
  assert.match(stockScopeMigration, /raise notice/);
  assert.match(stockScopeMigration, /return;/);
  assert.doesNotMatch(stockScopeMigration, /raise exception 'CK-PJS10 branch was not found/);
});

test("outlet analytics never presents unverified or no-line records as zero", () => {
  assert.match(outletQuery, /reliable_lines: trendLines\.length/);
  assert.match(outletQuery, /no_completed_records/);
  assert.match(demandPage, /report\.coverage\.reliable_lines === 0/);
  assert.match(demandPage, /report\.coverage\.reliable_lines \? formatNumber\(report\.summary\.received\) : "Unavailable"/);
  assert.match(planningPage, /movement unavailable/);
});
