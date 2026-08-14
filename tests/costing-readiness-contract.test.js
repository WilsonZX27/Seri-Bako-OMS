const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const query = read("src/server/queries/costing-readiness.ts");
const page = read("src/app/(app)/reports/costing-readiness/page.tsx");
const insights = read("src/components/reports/costing-readiness-insights.tsx");
const reports = read("src/app/(app)/reports/page.tsx");
const version = read("src/lib/app-version.ts");

test("Costing Readiness is a protected read-only report with an existing Reports entry", () => {
  assert.equal(fs.existsSync("src/app/(app)/reports/costing-readiness/page.tsx"), true);
  assert.match(query, /requirePermission\("recipes.view"\)/);
  assert.match(reports, /href: "\/reports\/costing-readiness"/);
  assert.match(page, /This is readiness only, not product margin/);
  assert.doesNotMatch(query, /\.(insert|update|delete)\(/);
});

test("Costing Readiness checks item, supplier-item, recipe, and product gaps", () => {
  assert.match(query, /Number\(item.cost\) <= 0/);
  assert.match(query, /Number\(row.unit_cost\) <= 0/);
  assert.match(query, /Number\(line.cost_per_unit\) <= 0 \|\| Number\(item.cost\) <= 0/);
  assert.match(query, /No linked active recipe\/BOM/);
  assert.match(query, /\/supplier-items\/\$\{row.id\}/);
  assert.match(query, /severity: "critical"/);
});

test("Costing Readiness gives clear severity and manual-action guidance", () => {
  assert.match(page, /Critical.*blocks trustworthy costing/);
  assert.match(page, /Warning.*should be fixed before margin review/);
  assert.match(page, /Info.*improves data quality/);
  assert.match(page, /Costing data is ready for review/);
  for (const action of ["Add item cost.", "Review supplier price.", "Link active recipe.", "Add recipe lines.", "Review inactive reference."]) assert.match(query, new RegExp(action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("Costing Readiness remains compatible with the current footer and the scoped Outlet Staff seed", () => {
  assert.match(version, /APP_VERSION = "\d+\.\d+\.\d+"/);
  assert.match(version, /APP_SPRINT = `v\$\{APP_VERSION\}`/);
  assert.match(read("supabase/migrations/066_create_outlet_staff_role.sql"), /outlet_staff/);
});

test("Costing Readiness compares severity-scoped module concentration before opening detail", () => {
  assert.match(query, /const severityScoped = issues\.filter/);
  assert.match(query, /const moduleSummary: CostingModuleSummary\[\]/);
  assert.match(page, /<CostingReadinessInsights/);
  assert.doesNotMatch(page, /<MetricStrip/);
  assert.match(insights, /InteractiveRankingChart/);
  assert.match(insights, /issue counts, not financial value/);
  assert.match(insights, /data-costing-readiness-insights/);
  assert.match(insights, /href: `\/reports\/costing-readiness\?\$\{params\.toString\(\)\}`/);
});
