const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/067_go_live_authorization_and_pr_workflow.sql");
const prInsertScopeFix = read("supabase/migrations/068_fix_purchase_request_insert_scope.sql");
const permissions = read("src/server/auth/permissions.ts");
const procurement = read("src/server/actions/procurement.ts");
const foundation = read("src/server/actions/foundation.ts");
const routes = read("src/server/auth/route-permissions.ts");
const dashboard = read("src/server/queries/dashboard.ts");

test("production authorization has one database source of truth", () => {
  const resolver = permissions.slice(permissions.indexOf("export async function resolveEffectivePermission"), permissions.indexOf("export async function hasPermission"));
  assert.match(resolver, /rpc\("has_any_permission"/);
  assert.match(resolver, /return data === true/);
  assert.doesNotMatch(resolver, /rolePermissionMatrix|staff_roles|staff_permission_overrides|auth\.getUser/);
});

test("PR reads are company and branch scoped while workflow writes are RPC-only", () => {
  assert.match(migration, /create or replace function public\.can_access_purchase_request/);
  assert.match(migration, /actor\.company_id is distinct from target_company_id/);
  assert.match(migration, /from public\.staff_branches/);
  assert.match(migration, /revoke update on public\.purchase_requests from authenticated/);
  assert.match(migration, /create or replace function public\.link_purchase_request_document/);
  assert.match(procurement, /rpc\("link_purchase_request_document"/);
  assert.doesNotMatch(procurement, /from\("purchase_requests"\)\.update\(\{ status:/);
  assert.match(prInsertScopeFix, /s\.company_id is not distinct from purchase_requests\.company_id/);
  assert.match(prInsertScopeFix, /sb\.branch_id = purchase_requests\.branch_id/);
  for (const permission of ["pr.create", "pr.submit", "pr.admin_review", "pr.finance_review", "pr.cancel", "pr.view_all"]) {
    assert.match(prInsertScopeFix, new RegExp(permission.replace(".", "\\.")));
  }
  assert.doesNotMatch(prInsertScopeFix, /'already_applied', true/);
});

test("PR transitions are locked, atomic, permission-aware and idempotent", () => {
  assert.match(migration, /create or replace function public\.transition_purchase_request/);
  assert.match(migration, /for update/);
  for (const action of ["submit", "manager_approve", "admin_approve", "finance_approve", "reject", "cancel"]) {
    assert.match(migration, new RegExp(`'${action}'`));
  }
  for (const permission of ["pr.submit", "pr.manager_approve", "pr.admin_review", "pr.finance_review", "pr.reject", "pr.cancel"]) {
    assert.match(migration, new RegExp(permission.replace(".", "\\.")));
  }
  assert.match(migration, /'already_applied', true/);
  assert.match(migration, /insert into public\.activity_logs/);
  assert.match(migration, /set search_path = public/g);
  assert.match(procurement, /rpc\("transition_purchase_request"/);
});

test("role permission storage remains database-protected while the UI is read-only", () => {
  assert.match(migration, /create or replace function public\.set_role_permissions/);
  assert.match(migration, /Super Admin permissions cannot be changed here/);
  assert.match(migration, /Role belongs to another company/);
  assert.match(migration, /You cannot grant a role permission you do not have/);
  assert.match(migration, /revoke insert, update, delete on public\.role_permissions from authenticated/);
  for (const table of ["roles", "staff_roles", "staff_branches", "staff_locations", "staff_permission_overrides"]) {
    assert.match(migration, new RegExp(`revoke insert, update, delete on public\\.${table} from authenticated`));
  }
  assert.doesNotMatch(foundation, /export async function (?:createRole|updateRole|updateRolePermissions)/);
});

test("office administration is separated from finance and payables", () => {
  assert.match(migration, /r\.role_code in \('admin', 'operations_admin'\)/);
  assert.match(migration, /'supplier_invoice\.pay', 'supplier_invoice\.approve', 'supplier_invoice\.void'/);
  assert.match(migration, /has_permission\('supplier_invoice\.pay'\)/);
  assert.deepEqual(routes.match(/"\/supplier-invoices\/(aging|cash-flow)": \["supplier_invoice\.pay"\]/g)?.length, 2);
  assert.match(dashboard, /if \(isOwner \|\| isFinance\)/);
});

test("final owner protection counts only active Super Admin assignments", () => {
  assert.match(foundation, /\.eq\("role_code", "super_admin"\)/);
  assert.doesNotMatch(foundation, /\.in\("role_code", \["super_admin", "admin"\]\)/);
});

test("migrations 067 and 068 are forward-only and older local migrations remain separate", () => {
  const outletRole = read("supabase/migrations/066_create_outlet_staff_role.sql");
  assert.equal(fs.existsSync("supabase/migrations/066_create_outlet_staff_role.sql"), true);
  assert.equal(fs.existsSync("supabase/migrations/067_go_live_authorization_and_pr_workflow.sql"), true);
  assert.equal(fs.existsSync("supabase/migrations/068_fix_purchase_request_insert_scope.sql"), true);
  assert.match(outletRole, /from public\.companies c/);
  assert.match(outletRole, /on conflict \(company_id, role_code\)/);
  assert.match(outletRole, /r\.company_id is not null/);
  assert.doesNotMatch(migration, /drop table|truncate|delete from public\.purchase_requests|delete from public\.staffs/i);
  assert.doesNotMatch(prInsertScopeFix, /drop table|truncate|delete from/i);
});
