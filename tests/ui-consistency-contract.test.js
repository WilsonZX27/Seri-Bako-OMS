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
const accountPage = read("src/app/(app)/account/page.tsx");
const masterDataFilters = read("src/components/master-data-filters.tsx");
const procurementPage = read("src/app/(app)/procurement/page.tsx");
const supplierItemsPage = read("src/app/(app)/supplier-items/page.tsx");
const uomConversionsPage = read("src/app/(app)/uom-conversions/page.tsx");
const staffsPage = read("src/app/(app)/people/page.tsx");
const purchaseReturnForm = read("src/components/purchase-return-form.tsx");

test("UI consistency keeps imports upload-only and permission details user-facing", () => {
  assert.doesNotMatch(imports, /Edit in table|Add blank row|Paste into table/);
  assert.match(imports, /Upload file/);
  assert.match(imports, /Confirm import/);
  assert.doesNotMatch(staffPermissions, /Technical details/);
  assert.match(staffPermissions, /role="switch"/);
  assert.match(staffPermissions, /Role default/);
  assert.doesNotMatch(staffPermissions, /<details/);
});

test("shared filter rows use compact operational-green submits without adding duplicate link icons", () => {
  assert.match(styles, /\.sb-list-filters:not\(\.sb-list-query-card\) > button:not\(\[data-select-control\]\):is\(\[type="submit"\], :not\(\[type\]\)\)/);
  assert.doesNotMatch(styles, /\.sb-list-filters > button:not\(\[data-select-control\]\)/);
  assert.match(styles, /background: var\(--sb-green-900\)/);
  assert.doesNotMatch(styles, /\.sb-list-filters > a::before/);
  assert.match(styles, /max-width: 22rem/);
  assert.match(masterDataFilters, /compactMobile[\s\S]*leadingFilter[\s\S]*!showStatus/);
  assert.match(masterDataFilters, /sb-list-filters--compact-mobile/);
  assert.match(styles, /\.sb-list-filters--compact-mobile:not\(\.sb-list-query-card\) \{[\s\S]*flex-wrap: nowrap/);
  assert.match(styles, /\.sb-list-filters--compact-mobile:not\(\.sb-list-query-card\) > button:is\([\s\S]*order: 3/);
  assert.match(styles, /\.sb-list-filters--compact-mobile:not\(\.sb-list-query-card\) > \.sb-filter-summary \{[\s\S]*order: 4/);
});

test("a visible status tab strip remains the only primary status filter", () => {
  for (const page of [
    "src/app/(app)/branches/page.tsx",
    "src/app/(app)/items/page.tsx",
    "src/app/(app)/recipes/page.tsx",
    "src/app/(app)/people/page.tsx",
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
  for (const route of ["dashboard/page.tsx", "outlet-daily-records/page.tsx", "reports/demand-trends/page.tsx", "production/planning/page.tsx", "production/variance/page.tsx", "administration/master-data-cleanup/page.tsx", "imports/page.tsx", "imports/[entity]/page.tsx", "staffs/[id]/page.tsx"]) {
    assert.equal(fs.existsSync(`src/app/(app)/${route}`), true);
  }
  assert.doesNotMatch(dashboard, /rightRail=\{isOutlet \? undefined/);
  assert.match(dashboard, /ConsoleSection title="Actions"/);
  assert.match(dashboard, /tabletRailMode="context"/);
  assert.doesNotMatch(dashboard, /ConsoleSection title="Workspace context"|Panel title="Alerts"/);
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

test("administration decision directories replace narrow tables with shared operational lists", () => {
  const cleanup = read("src/app/(app)/administration/master-data-cleanup/page.tsx");
  const sequences = read("src/app/(app)/document-sequences/page.tsx");
  const staffs = read("src/app/(app)/people/page.tsx");

  assert.match(cleanup, /<Table mobileHidden stickyColumn="second" aria-label="Master data cleanup issues">/);
  assert.match(cleanup, /<OperationalList ariaLabel="Master data cleanup issues">/);
  assert.match(cleanup, /Next: \{issue\.action\}/);
  assert.match(sequences, /<Table mobileHidden aria-label="Document sequences"/);
  assert.match(sequences, /<OperationalList ariaLabel="Document sequences">/);
  assert.match(sequences, /Current period \$\{sequence\.preview_number/);
  assert.match(sequences, /Next \$\{sequence\.next_number\}/);
  assert.match(staffs, /<Table[^>]*mobileHidden[^>]*aria-label="Employees"/);
  assert.match(staffs, /<OperationalList ariaLabel="Employees" className="overflow-hidden">/);
  assert.match(staffs, /staffAuthStateLabels\[getStaffAuthState\(staff\)\]/);
  assert.match(staffs, /staff\.default_branch_name\?\?"No default outlet"/);
});

test("status filters identify the field when showing the unfiltered view", () => {
  const statusTabs = read("src/components/status-tabs.tsx");
  const masterFilters = read("src/components/master-data-filters.tsx");
  assert.match(statusTabs, /value: "all", label: "All statuses"/);
  assert.match(masterFilters, /value: "all", label: "All statuses"/);
  assert.doesNotMatch(statusTabs, /value: "all", label: "All"/);
});

test("stock count sessions preserve workflow orientation throughout long entry lists", () => {
  const stockCountForm = read("src/components/stock-count-form.tsx");
  const documentWorkspace = read("src/components/documents/document-workspace.tsx");
  const createPage = read("src/app/(app)/stock-counts/new/page.tsx");

  assert.doesNotMatch(stockCountForm, /data-stock-count-mobile-progress|Step 1 of 2/);
  assert.match(stockCountForm, /data-stock-count-setup/);
  assert.match(documentWorkspace, /workflowSteps/);
  assert.match(createPage, /hideWorkflow/);
  assert.doesNotMatch(createPage, /Step 1 of 2|workflowSteps=/);
  assert.match(stockCountForm, /hidden border-y[\s\S]*Item[\s\S]*Variance[\s\S]*Count/);
  assert.doesNotMatch(stockCountForm, /sticky top-\[7\.25rem\]|xl:top-\[7\.75rem\]/);
  assert.match(stockCountForm, /border-b border-\[var\(--sb-border-soft\)\]/);
  assert.doesNotMatch(documentWorkspace, /shadow-\[0_8px_22px_rgb\(6_44_31_\/_0\.16\)\]/);
  assert.doesNotMatch(stockCountForm, /bg-white|text-white|border-white/);
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

test("account settings use the contained workspace and shared contextual action rail", () => {
  assert.match(accountPage, /<WorkspaceGrid documentMode tabletRailMode="split" tabletCanvas="contained" rightRail=\{accountContext\}>/);
  assert.match(accountPage, /data-account-identity/);
  assert.match(accountPage, /form="account-profile-form"[\s\S]*data-mobile-primary-action/);
  assert.match(accountPage, /id="account-profile-form"/);
  assert.match(accountPage, /ConsoleSection title="Profile picture"/);
  assert.doesNotMatch(accountPage, /<Card|CardContent/);
});

test("mobile operational hubs keep their own primary action without a duplicate generic More bar", () => {
  assert.match(procurementPage, /<WorkspaceGrid[\s\S]*hideMobileConsole[\s\S]*rightRail=/);
  assert.match(procurementPage, /<OperationalHub/);
  assert.match(procurementPage, /primaryAction=/);
});

test("operational tables use one compact accessible Action column and hide generated document numbers", () => {
  for (const [name, source] of [
    ["supplier items", supplierItemsPage],
    ["UOM conversions", uomConversionsPage],
    ["staffs", staffsPage],
  ]) {
    assert.match(source, /<TableHead[^>]*>Action<\/TableHead>/, `${name}: shared Action heading contract`);
    assert.doesNotMatch(source, /<TableHead[^>]*>Actions<\/TableHead>/, `${name}: no plural Actions heading`);
  }
  assert.doesNotMatch(purchaseReturnForm, /Auto-generated on submit|label="Return No"/);
  assert.match(purchaseReturnForm, /name="purchase_return_no" value="PRT-AUTO"/);
});
