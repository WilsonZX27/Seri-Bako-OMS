const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const query = read("src/server/queries/costing-readiness.ts");
const page = read("src/app/(app)/reports/costing-readiness/page.tsx");
const reports = read("src/app/(app)/reports/page.tsx");
const version = read("src/lib/app-version.ts");

test("Costing Readiness is a protected read-only report with an existing Reports entry", () => {
  assert.equal(fs.existsSync("src/app/(app)/reports/costing-readiness/page.tsx"), true);
  assert.match(query, /requirePermission\("reports.view"\)/);
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

test("Costing Readiness has the Sprint 7.18 footer and adds no migration 066", () => {
  assert.match(version, /APP_VERSION = "0\.2\.26"/);
  assert.match(version, /APP_SPRINT = "Sprint 7\.18"/);
  assert.equal(fs.readdirSync("supabase/migrations").some((file) => file.startsWith("066_")), false);
});
