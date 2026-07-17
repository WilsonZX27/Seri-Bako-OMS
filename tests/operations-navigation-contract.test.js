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

test("dashboard follows the operations decision order without recent activity", () => {
  for (const href of ["/outlet-daily-records", "/reports/demand-trends", "/production/variance", "/production/planning"]) {
    assert.match(dashboard, new RegExp(`href=\\{?"${href.replaceAll("/", "\\/")}`));
  }
  assert.match(dashboard, /Action Required[\s\S]*Outlet Record Health[\s\S]*Demand Confidence[\s\S]*Wastage and Variance[\s\S]*Production Planning Reference[\s\S]*Stock Exceptions[\s\S]*Finance \/ Payables Attention/);
  assert.doesNotMatch(dashboard, /ConsoleSection title="Recent Activity"/);
});

test("Sprint 7.17.2 preserves existing responsive tables and introduces no migration 066", () => {
  const version = read("src/lib/app-version.ts");
  const styles = read("src/app/globals.css");
  assert.match(styles, /\.sb-table-region\s*\{[\s\S]*overflow-x: auto/);
  assert.match(version, /APP_VERSION = "0\.2\.25"/);
  assert.match(version, /APP_SPRINT = "Sprint 7\.17\.2"/);
  assert.equal(fs.readdirSync("supabase/migrations").some((file) => file.startsWith("066_")), false);
});
