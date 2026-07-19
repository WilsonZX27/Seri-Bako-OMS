const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("dashboard composition is all-role, task-first, and finance-gated", () => {
  const ia = read("src/lib/information-architecture.ts");
  const query = read("src/server/queries/dashboard.ts");
  const view = read("src/components/dashboard-workspace.tsx");
  assert.match(ia, /href: "\/dashboard"[\s\S]*roles: ALL[\s\S]*defaultFor: ALL/);
  assert.match(query, /if \(isOwner \|\| isFinance\)/);
  assert.match(query, /isOutlet \? db\.from\("outlet_daily_records"\)/);
  assert.match(view, /showFinance \? <Panel title="Payables and cash obligations"/);
  assert.match(view, /Only your assigned outlet’s record is shown/);
  assert.doesNotMatch(view, /Backup|role management|document sequence/i);
});

test("migration 072 grants Finance read union without Manager Review or purchasing mutations", () => {
  const sql = read("supabase/migrations/072_finance_operational_visibility.sql");
  assert.match(sql, /r\.role_code = 'finance'/);
  assert.doesNotMatch(sql, /'pr\.manager_approve'/);
  assert.match(sql, /permission_code = 'dashboard\.view'[\s\S]*'super_admin', 'finance', 'manager', 'purchasing', 'kitchen', 'outlet_staff'/);
  assert.match(sql, /purchase_request_self_approval_guard/);
  assert.doesNotMatch(sql, /'po\.create'|'po\.send'|'items\.create'|'suppliers\.manage'|'settings\.manage'|'roles\.update'/);
  assert.doesNotMatch(sql, /delete from public\.(purchase_requests|purchase_orders|goods_receivings|stock_transactions)/);
});

test("fallback permission matrix mirrors the database capability hierarchy", () => {
  const permissions = read("src/server/auth/permissions.ts");
  const finance = permissions.match(/finance: \[([^\]]+)\]/s)?.[1] ?? "";
  assert.doesNotMatch(finance, /"pr\.manager_approve"/);
  assert.match(finance, /"production\.view"/);
  assert.match(finance, /"supplier_invoice\.pay"/);
  assert.doesNotMatch(finance, /"settings\.manage"|"po\.create"|"items\.create"/);
});
