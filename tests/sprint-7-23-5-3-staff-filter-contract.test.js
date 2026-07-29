const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("Staff access uses branches directly and avoids ambiguous location embeds", () => {
  const actions = read("src/server/actions/foundation.ts");
  const queries = read("src/server/queries/foundation.ts");
  const form = read("src/components/staff-access-fields.tsx");
  const detail = read("src/app/(app)/staffs/[id]/page.tsx");
  const create = read("src/app/(app)/staffs/new/page.tsx");

  assert.doesNotMatch(actions, /branches\(branch_type\)/);
  assert.match(actions, /rpc\("replace_staff_access_atomic"/);
  assert.match(actions, /accessible_branch_ids/);
  assert.doesNotMatch(actions, /accessible_location_ids/);
  assert.match(queries, /staffBranchIds/);
  assert.doesNotMatch(`${detail}\n${create}`, /getLocations/);
  assert.match(form, /label="Role"/);
  assert.match(form, /label="Default Branch"/);
  assert.match(form, /label="Accessible Branches"/);
  assert.doesNotMatch(form, /Location|Branch \/ Outlet/);
});

test("one canonical six-role catalogue feeds the Staff dropdown", () => {
  const roles = read("src/lib/roles.ts");
  const queries = read("src/server/queries/foundation.ts");
  const form = read("src/components/staff-access-fields.tsx");
  const expected = ["Super Admin / Owner", "Finance", "Manager", "Purchasing", "Kitchen", "Outlet Staff"];

  assert.match(roles, /SYSTEM_ROLE_CODES = \["super_admin", "finance", "manager", "purchasing", "kitchen", "outlet_staff"\]/);
  for (const label of expected) assert.equal((roles.match(new RegExp(`"${label.replace("/", "\\/")}"`, "g")) ?? []).length, 1, label);
  assert.match(roles, /new Map<SystemRoleCode, T>/);
  assert.match(queries, /sortRolesForDisplay/);
  assert.match(form, /options=\{roles\.map/);
  assert.doesNotMatch(form, /normalizeRoleCode\(role\.role_code\)/);
});

test("canonical select and FilterBar preserve keyboard behavior without nested row scrolling", () => {
  const select = read("src/components/ui/select-control.tsx");
  const filters = read("src/components/ui/filter-bar.tsx");
  const styles = read("src/app/globals.css");
  const items = read("src/components/master-data-filters.tsx");
  const prs = read("src/app/(app)/purchase-requests/page.tsx");
  const invoices = read("src/app/(app)/supplier-invoices/page.tsx");

  assert.match(select, /@radix-ui\/react-select/);
  assert.match(select, /<Select\.Portal>/);
  assert.match(select, /z-\[var\(--sb-z-dropdown\)\]/);
  assert.match(filters, /event\.key === "Escape"/);
  assert.match(filters, /summaryRef\.current\?\.focus\(\)/);
  assert.match(filters, /Close filters/);
  assert.match(filters, /Changes take effect after you select Apply/);
  assert.match(styles, /\.sb-list-filters \{[\s\S]*overflow: visible/);
  assert.doesNotMatch(styles, /\.sb-list-filters \{[\s\S]{0,220}overflow-x: auto/);
  assert.match(styles, /\.sb-filter-more-fields \{[\s\S]*overflow-y: auto/);
  for (const source of [items, prs, invoices]) assert.match(source, /SelectControl/);
  assert.match(invoices, /FilterBarMore/);
});

test("the visible footer uses the current version contract and the Production correction stays a rollback runbook", () => {
  const sidebar = read("src/components/layout/workspace-sidebar.tsx");
  const version = read("src/lib/app-version.ts");
  const runbook = read("docs/qa/SPRINT_7_23_5_3_STAFF_ROLE_CORRECTION_RUNBOOK.md");

  assert.match(version, /APP_SPRINT = `v\$\{APP_VERSION\}`/);
  assert.match(sidebar, />\{APP_RELEASE_NOTE\}<\/div>/);
  assert.doesNotMatch(sidebar, /APP_VERSION/);
  assert.match(read("src/components/layout/mobile-sidebar.tsx"), /w-\[min\(var\(--sb-sidebar-width\),88vw\)\]/);
  assert.match(runbook, /No Production mutation was performed/);
  assert.match(runbook, /rollback;/);
  assert.doesNotMatch(runbook, /^commit;/im);
});


