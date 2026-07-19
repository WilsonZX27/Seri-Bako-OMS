const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("Manager PR scope is company-wide without Finance or Owner capability", () => {
  const migration = read("supabase/migrations/075_manager_company_wide_operational_scope.sql");
  const permissions = read("src/server/auth/permissions.ts");
  const routes = read("src/server/auth/route-permissions.ts");
  const ia = read("src/lib/information-architecture.ts");

  assert.match(migration, /p\.permission_code = 'pr\.view_all'[\s\S]*r\.role_code = 'manager'/);
  assert.match(migration, /r\.role_code = 'manager'[\s\S]*p\.permission_code in \('pr\.view_branch', 'supplier_invoice\.view'\)/);
  assert.match(migration, /actor\.company_id is distinct from target_company_id/);
  assert.match(migration, /r\.role_code = 'manager'[\s\S]*return true/);
  assert.doesNotMatch(migration, /return target_requested_by = actor\.id/);

  const managerFallback = permissions.match(/manager: \[(.*?)\],\n  purchasing:/s)?.[1] ?? "";
  assert.match(managerFallback, /"pr\.view_all"/);
  assert.doesNotMatch(managerFallback, /"pr\.view_branch"/);
  for (const forbidden of ["pr.finance_review", "supplier_invoice.view", "supplier_invoice.pay", "recipes.view", "roles.read", "settings.manage"]) {
    assert.doesNotMatch(managerFallback, new RegExp(`"${forbidden.replaceAll(".", "\\.")}"`));
  }
  assert.match(routes, /"\/supplier-invoices\/aging": \["supplier_invoice\.pay"\]/);
  assert.match(routes, /"\/supplier-invoices\/cash-flow": \["supplier_invoice\.pay"\]/);
  for (const report of ["costing-readiness", "recipe-costing", "product-margin"]) {
    assert.match(routes, new RegExp(`"/reports/${report}": \\["recipes\\.view"\\]`));
  }
  assert.match(ia, /href: "\/recipes"[\s\S]*roles: \["super_admin", "finance"\]/);
});

test("Manager regression fixture covers both named cross-branch PRs and lower-role isolation", () => {
  const sql = read("tests/sql/sprint-7-23-5-1-local-verification.sql");
  assert.match(sql, /'OFFICE', 'Office'/);
  assert.match(sql, /'CK-PJS10', 'CK-PJS10'/);
  assert.match(sql, /'CK-ALMA', 'CK-ALMA'/);
  assert.match(sql, /request_no in \('PR-00008', 'PR-00011'\)/);
  assert.match(sql, /Manager fixture must retain only Office branch context/);
  assert.match(sql, /Kitchen can read an out-of-branch PR/);
  assert.match(sql, /Outlet Staff can read an out-of-branch PR/);
  assert.match(sql, /Manager Review did not advance the cross-branch PR/);
  assert.match(sql, /Finance company-wide PR visibility changed/);
  assert.match(sql, /Owner PR visibility changed/);
});
