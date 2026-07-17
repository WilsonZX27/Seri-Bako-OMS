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

test("dashboard links each control-center section to its relevant page", () => {
  for (const href of ["/outlet-daily-records", "/reports/demand-trends", "/production/variance", "/production/planning"]) {
    assert.match(dashboard, new RegExp(`href=\\{?"${href.replaceAll("/", "\\/")}`));
  }
  assert.match(dashboard, /Control Center Notes[\s\S]*Recent Activity[\s\S]*Payables Attention/);
});

test("Sprint 7.16.1 preserves existing responsive tables and introduces no migration 066", () => {
  const version = read("src/lib/app-version.ts");
  const styles = read("src/app/globals.css");
  assert.match(styles, /\.sb-table-region\s*\{[\s\S]*overflow-x: auto/);
  assert.match(version, /APP_VERSION = "0\.2\.24"/);
  assert.match(version, /APP_SPRINT = "Sprint 7\.16\.1"/);
  assert.equal(fs.readdirSync("supabase/migrations").some((file) => file.startsWith("066_")), false);
});
