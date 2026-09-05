const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("People rows keep identity compact and omit redundant open copy", () => {
  const people = read("src", "app", "(app)", "people", "page.tsx");
  const staff = read("src", "app", "(app)", "staffs", "page.tsx");
  const table = read("src", "components", "ui", "table.tsx");
  assert.doesNotMatch(people, /meta="Open profile"/);
  assert.match(staff, /className="erp-surface overflow-hidden"/);
  assert.match(table, /secondary \? <div className="mt-0\.5/);
});

test("new Staff hides generated auth fields and states the temporary-password flow", () => {
  const form = read("src", "components", "foundation-forms.tsx");
  const page = read("src", "app", "(app)", "staffs", "new", "page.tsx");
  assert.match(form, /type="hidden" name="temporary_password" value=""/);
  assert.doesNotMatch(form, /Leave blank to auto-generate/);
  assert.match(page, /issue an auto-generated temporary password/);
});

test("schedule asks for time per Add and avoids the native time picker", () => {
  const planner = read("src", "components", "attendance", "schedule-planner.tsx");
  assert.match(planner, /const \[active,setActive\]=useState<Palette\|null>\(null\)/);
  assert.match(planner, /customDialog\.current\?\.showModal\(\)/);
  assert.match(planner, /const palette=leavePalette/);
  assert.doesNotMatch(planner, /type="time"/);
  assert.match(planner, /fixed inset-0 m-auto/);
});

test("Owner self-update and historical Outlet Daily closure are audited", () => {
  const migration = read("supabase", "migrations", "264_owner_self_update_and_historical_outlet_posting.sql");
  assert.match(migration, /actor_is_owner := public\.current_staff_has_company_role/);
  assert.match(migration, /set_config\('seri_bako\.bootstrap_owner_assignment', 'authorized', true\)/);
  assert.match(migration, /record\.record_date < date '2026-09-05'/);
  assert.match(migration, /insert into public\.activity_logs/);
});

test("Attendance, calendar and PO headers retain stable alignment", () => {
  const nav = read("src", "components", "attendance", "attendance-workspace-nav.tsx");
  const calendar = read("src", "components", "compliance-month-calendar.tsx");
  const po = read("src", "app", "(app)", "purchase-orders", "page.tsx");
  assert.match(nav, /repeat\(\$\{visible\.length\}, minmax\(0, 1fr\)\)/);
  assert.match(calendar, /grid-cols-\[auto_minmax\(0,1fr\)_auto\]/);
  assert.match(po, /className="min-w-36" label="PO No \/ PR No"/);
  assert.match(po, /className="w-40 max-w-40">Request context/);
});
