const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const imports = read("src/components/imports/import-workflow.tsx");
const staffPermissions = read("src/components/staff-permission-overrides.tsx");
const styles = read("src/app/globals.css");
const dashboard = read("src/components/dashboard-workspace.tsx");
const priorityBadge = read("src/components/priority-badge.tsx");
const systemStates = read("src/components/ui/system-states.tsx");
const authSetPassword = read("src/app/(auth)/set-password/page.tsx");
const administration = read("src/app/(app)/administration/page.tsx");
const importsIndex = read("src/app/(app)/imports/page.tsx");
const operationalToolList = read("src/components/operational-tool-list.tsx");

test("UI consistency keeps imports upload-only and technical permission details collapsed", () => {
  assert.doesNotMatch(imports, /Edit in table|Add blank row|Paste into table/);
  assert.match(imports, /Upload file/);
  assert.match(imports, /Confirm import/);
  assert.match(staffPermissions, /Technical details/);
  assert.match(staffPermissions, /<details key=\{module\}/);
});

test("shared filter rows use compact operational-green submits without adding duplicate link icons", () => {
  assert.match(styles, /\.sb-list-filters > button:not\(\[data-select-control\]\):is\(\[type="submit"\], :not\(\[type\]\)\)/);
  assert.match(styles, /background: var\(--sb-green-900\)/);
  assert.doesNotMatch(styles, /\.sb-list-filters > a::before/);
  assert.match(styles, /max-width: 22rem/);
});

test("a visible status tab strip remains the only primary status filter", () => {
  for (const page of [
    "src/app/(app)/branches/page.tsx",
    "src/app/(app)/items/page.tsx",
    "src/app/(app)/recipes/page.tsx",
    "src/app/(app)/staffs/page.tsx",
    "src/app/(app)/suppliers/page.tsx",
  ]) {
    const source = read(page);
    assert.match(source, /StatusTabs/, `${page}: status tabs are present`);
    assert.match(source, /MasterDataFilters[\s\S]*showStatus=\{false\}/, `${page}: no duplicate status select`);
  }
  const invoices = read("src/app/(app)/supplier-invoices/page.tsx");
  assert.match(invoices, /<StatusTabs/);
  assert.doesNotMatch(invoices, /<SelectControl\s+name="status"/);
  assert.match(invoices, /filters\.status \? <input type="hidden" name="status"/);
});

test("production jobs composes the shared workspace shell instead of maintaining a private console and desktop-only tabs", () => {
  const source = read("src/app/(app)/production/jobs/page.tsx");
  assert.match(source, /<WorkspaceGrid/);
  assert.match(source, /rightRail=\{<>/);
  assert.match(source, /<StatusTabs/);
  assert.doesNotMatch(source, /<RightConsoleMount/);
  assert.doesNotMatch(source, /hidden flex-wrap gap-2 md:flex/);
});

test("the read-only role matrix uses the shared contained workspace and a non-scrolling phone summary", () => {
  const source = read("src/app/(app)/roles/page.tsx");
  assert.match(source, /<WorkspaceGrid[\s\S]*tabletCanvas="contained"/);
  assert.match(source, /hideMobileConsole/);
  assert.match(source, /<Notice tone="info"/);
  assert.match(source, /<Table mobileHidden aria-label="Roles and permissions"/);
  assert.match(source, /aria-label="Roles and permissions"/);
  assert.doesNotMatch(source, /overflow-x-auto/);
});

test("UI smoke keeps the requested routes, console order, current footer, and one tablet action entry", () => {
  for (const route of ["dashboard/page.tsx", "outlet-daily-records/page.tsx", "reports/demand-trends/page.tsx", "production/planning/page.tsx", "production/variance/page.tsx", "administration/master-data-cleanup/page.tsx", "imports/page.tsx", "imports/[entity]/page.tsx", "staffs/[id]/page.tsx", "roles/[id]/page.tsx"]) {
    assert.equal(fs.existsSync(`src/app/(app)/${route}`), true);
  }
  assert.match(dashboard, /ConsoleSection title="Today"[\s\S]*ConsoleSection title="Alerts"/);
  assert.doesNotMatch(dashboard, /<header[\s\S]*primaryAction\.href/);
  assert.doesNotMatch(dashboard, /ConsoleSection title="Recent Activity"/);
  assert.match(read("src/lib/app-version.ts"), /APP_SPRINT = `v\$\{APP_VERSION\}`/);
  assert.match(read("supabase/migrations/066_create_outlet_staff_role.sql"), /outlet_staff/);
});

test("shared operational feedback uses semantic state tokens instead of one-off palettes", () => {
  assert.match(priorityBadge, /--sb-danger-bg/);
  assert.match(priorityBadge, /--sb-warning-bg/);
  assert.doesNotMatch(priorityBadge, /(?:border|bg|text)-(?:red|pink|emerald|amber)-\d/);
  assert.match(systemStates, /--sb-success-bg/);
  assert.match(systemStates, /--sb-info-bg/);
  assert.doesNotMatch(systemStates, /(?:border|bg|text)-(?:emerald|blue|amber|purple|teal|slate|red)-\d/);
  assert.match(authSetPassword, /<Notice tone="error">/);
  assert.match(authSetPassword, /<Notice tone="warning"/);
});

test("administration and import directories use the shared flat operational tool list", () => {
  assert.equal(fs.existsSync("src/components/category-card-grid.tsx"), false);
  assert.match(administration, /<WorkspaceGrid tabletCanvas="contained">/);
  assert.match(importsIndex, /<WorkspaceGrid tabletCanvas="contained">/);
  assert.match(administration, /<OperationalToolList items=\{links\}/);
  assert.match(importsIndex, /<OperationalToolList items=\{items\}/);
  assert.match(operationalToolList, /divide-y divide-\[var\(--sb-border-soft\)\]/);
  assert.doesNotMatch(operationalToolList, /CardContent|md:grid/);
});
