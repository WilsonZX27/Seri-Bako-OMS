const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const imports = read("src/components/imports/import-workflow.tsx");
const staffPermissions = read("src/components/staff-permission-overrides.tsx");
const roleMatrix = read("src/components/role-permission-matrix.tsx");
const styles = read("src/app/globals.css");
const dashboard = read("src/components/dashboard-workspace.tsx");

test("UI consistency keeps imports upload-only and technical permission details collapsed", () => {
  assert.doesNotMatch(imports, /Edit in table|Add blank row|Paste into table/);
  assert.match(imports, /Upload file/);
  assert.match(imports, /Confirm import/);
  assert.match(staffPermissions, /Technical details/);
  assert.match(staffPermissions, /<details key=\{module\}/);
  assert.match(roleMatrix, /<details key=\{module\}/);
});

test("shared filter rows use compact brown submits without adding duplicate link icons", () => {
  assert.match(styles, /\.sb-list-filters > button:is\(\[type="submit"\], :not\(\[type\]\)\)/);
  assert.match(styles, /background: var\(--sb-amber-700\)/);
  assert.doesNotMatch(styles, /\.sb-list-filters > a::before/);
  assert.match(styles, /max-width: 22rem/);
});

test("UI smoke keeps the requested routes, console order, and current footer", () => {
  for (const route of ["dashboard/page.tsx", "outlet-daily-records/page.tsx", "reports/demand-trends/page.tsx", "production/planning/page.tsx", "production/variance/page.tsx", "administration/master-data-cleanup/page.tsx", "imports/page.tsx", "imports/[entity]/page.tsx", "staffs/[id]/page.tsx", "roles/[id]/page.tsx"]) {
    assert.equal(fs.existsSync(`src/app/(app)/${route}`), true);
  }
  assert.match(dashboard, /Quick Actions[\s\S]*Payables Attention[\s\S]*Control Center Notes/);
  assert.doesNotMatch(dashboard, /ConsoleSection title="Recent Activity"/);
  assert.match(read("src/lib/app-version.ts"), /APP_SPRINT = "Sprint 7\.19"/);
  assert.equal(fs.readdirSync("supabase/migrations").some((file) => file.startsWith("066_")), false);
});
