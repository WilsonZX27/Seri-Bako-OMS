const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const nav = read("src/components/layout/nav-items.ts");
const production = read("src/app/(app)/production/page.tsx");
const reports = read("src/app/(app)/reports/page.tsx");
const dashboard = read("src/components/dashboard-workspace.tsx");

test("operations navigation keeps one clear path for each new operational page", () => {
  assert.match(nav, /href: "\/dashboard"/);
  assert.match(nav, /href: "\/outlet-daily-records"/);
  assert.match(production, /href: "\/production\/planning"/);
  assert.match(production, /href: "\/production\/variance"/);
  assert.match(reports, /href: "\/reports\/demand-trends"/);
  assert.doesNotMatch(reports, /\/production\/(planning|variance)/);
});

test("dashboard follows the visual priority layout without recent activity", () => {
  for (const href of ["/outlet-daily-records", "/reports/demand-trends", "/production/variance", "/production/planning"]) {
    assert.match(dashboard, new RegExp(`href=\\{?"${href.replaceAll("/", "\\/")}`));
  }
  assert.match(dashboard, /Today’s Attention[\s\S]*Procurement Queue[\s\S]*Outlet Record Health[\s\S]*Demand Confidence[\s\S]*Wastage and Variance[\s\S]*Finance \/ Payables Attention[\s\S]*Production Planning Reference[\s\S]*Stock Exceptions/);
  assert.doesNotMatch(dashboard, /ConsoleSection title="Recent Activity"/);
});

test("current sprint preserves existing responsive tables with a scoped Outlet Staff seed", () => {
  const version = read("src/lib/app-version.ts");
  const styles = read("src/app/globals.css");
  assert.match(styles, /\.sb-table-region\s*\{[\s\S]*overflow-x: auto/);
  assert.match(version, /APP_VERSION = "0\.2\.31"/);
  assert.match(version, /APP_SPRINT = "Sprint 7\.21\.5"/);
  assert.match(read("supabase/migrations/066_create_outlet_staff_role.sql"), /outlet_staff/);
});
