const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const nav = read("src/lib/information-architecture.ts");
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

test("dashboard follows the role-aware task priority layout without recent activity", () => {
  for (const phrase of ["Actions awaiting you", "Operational pipeline", "Exceptions requiring follow-up", "Payables and cash obligations"]) assert.match(dashboard, new RegExp(phrase));
  assert.match(dashboard, /Outlet Today/);
  assert.match(dashboard, /Kitchen Workdesk/);
  assert.doesNotMatch(dashboard, /ConsoleSection title="Recent Activity"/);
});

test("current sprint preserves existing responsive tables with a scoped Outlet Staff seed", () => {
  const version = read("src/lib/app-version.ts");
  const styles = read("src/app/globals.css");
  assert.match(styles, /\.sb-table-region\s*\{[\s\S]*overflow-x: auto/);
  assert.match(version, /APP_VERSION = "7\.23\.7\.0"/);
  assert.match(version, /APP_SPRINT = "v7\.23\.7\.0"/);
  assert.match(read("supabase/migrations/066_create_outlet_staff_role.sql"), /outlet_staff/);
});


