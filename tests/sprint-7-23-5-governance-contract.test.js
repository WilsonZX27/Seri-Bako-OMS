const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("idle timeout has a dedicated stable access state", () => {
  const timeout = read("src/components/session-timeout-provider.tsx");
  const status = read("src/app/(auth)/access-status/page.tsx");
  const setup = read("src/app/(auth)/set-password/page.tsx");
  assert.match(timeout, /reason=idle-timeout/);
  assert.match(status, /Your session ended due to inactivity\. Please sign in again\./);
  assert.match(status, /Sign in again/);
  assert.match(status, /reason === "idle-timeout"/);
  assert.match(setup, /Invitation link expired/);
  assert.match(setup, /This link has expired or was already used/);
});

test("governance permissions are centralized and owner accounts stay protected", () => {
  const permissions = read("src/server/auth/permissions.ts");
  const actions = read("src/server/actions/foundation.ts");
  const migration = read("supabase/migrations/073_operating_governance_permissions.sql");
  assert.match(permissions, /finance:[\s\S]*"staffs\.create"[\s\S]*"document_sequences\.create"[\s\S]*"imports\.create"[\s\S]*"branches\.update"/);
  assert.match(permissions, /manager:[\s\S]*"branches\.create"[\s\S]*"branches\.update"/);
  assert.match(permissions, /purchasing:[\s\S]*"branches\.read"/);
  assert.match(actions, /assertCanManageStaffAccount/);
  assert.match(migration, /staff_is_protected_owner/);
  assert.match(migration, /current_staff_company_id/);
  assert.match(migration, /staff roles scoped manage/);
  assert.match(migration, /r\.role_code = 'super_admin'/);
  assert.match(migration, /staff branches scoped manage/);
  assert.match(migration, /staff scope compatibility manage/);
  assert.doesNotMatch(migration, /delete from public\.(purchase_requests|purchase_orders|goods_receivings|stock_transactions)/);
});

test("PR creation is dense and uses the accessible urgency select", () => {
  const form = read("src/components/procurement-forms.tsx");
  const select = read("src/components/urgency-select.tsx");
  const badges = read("src/components/priority-badge.tsx");
  assert.match(form, /Request details/);
  assert.match(form, /grid-cols-2/);
  assert.match(form, /sm:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1\.4fr\)_minmax\(0,1fr\)\]/);
  assert.match(form, /rows=\{2\}/);
  assert.match(form, /<UrgencySelect/);
  assert.doesNotMatch(form, /When and where|Additional details/);
  assert.match(select, /@radix-ui\/react-select/);
  for (const value of ["critical", "urgent", "normal", "low"]) assert.match(badges, new RegExp(`value: "${value}"`));
  assert.match(form, /useState<ProcurementPriority>\(initialPriority \?\? "normal"\)/);
});

test("Procurement and Inventory are canonical navigable workspaces", () => {
  const nav = read("src/components/layout/nav-items.ts");
  const sidebar = read("src/components/layout/workspace-sidebar.tsx");
  const procurement = read("src/app/(app)/procurement/page.tsx");
  const inventory = read("src/app/(app)/inventory/page.tsx");
  assert.match(nav, /id === "procurement" \|\| id === "inventory" \? `\/\$\{id\}`/);
  assert.match(sidebar, /<Link href=\{group\.href\}/);
  assert.match(sidebar, /aria-label=\{`\$\{groupClosed \? "Expand" : "Collapse"\} \$\{group\.label\}`\}/);
  assert.match(procurement, /Procurement Workspace/);
  assert.match(procurement, /My Work Queue/);
  assert.match(inventory, /Inventory Workspace/);
  assert.match(inventory, /Low stock|Low Stock/);
  assert.doesNotMatch(`${procurement}\n${inventory}`, /Location|Quick Tools/i);
});

test("Location routes and visible runtime are removed with Barcode", () => {
  for (const file of ["src/app/(app)/locations/page.tsx", "src/app/(app)/locations/new/page.tsx", "src/app/(app)/locations/[id]/page.tsx"]) {
    assert.equal(fs.existsSync(file), false, `${file} must not remain as a compatibility route`);
  }
  const visibleFiles = [
    "src/lib/information-architecture.ts",
    "src/components/layout/breadcrumbs.tsx",
    "src/app/(app)/stock-balance/page.tsx",
    "src/app/(app)/inventory/page.tsx",
  ];
  for (const file of visibleFiles) assert.doesNotMatch(read(file), /Location|Barcode/i, file);
  const forms = read("src/components/foundation-forms.tsx");
  assert.doesNotMatch(forms, /label="Default Location"|label="Accessible Locations"|>Location</);
  assert.equal(fs.existsSync("src/server/queries/barcodes.ts"), false);
});

test("native controls and generated artifacts follow the product contract", () => {
  const css = read("src/app/globals.css");
  const ignore = read(".gitignore");
  assert.match(css, /input,\s*select,\s*textarea,\s*button/);
  assert.match(css, /::file-selector-button/);
  for (const entry of ["test-results/", "playwright-report/", "playwright/.cache/", "coverage/", ".next/", "*.log", ".env.test.local"]) assert.match(ignore, new RegExp(entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const authShell = read("src/components/auth/auth-shell.tsx");
  assert.match(authShell, /APP_RELEASE_NOTE/);
  assert.doesNotMatch(authShell, /APP_VERSION/);
});
