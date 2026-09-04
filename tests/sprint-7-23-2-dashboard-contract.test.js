const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("dashboard composition is all-role, task-first, and finance-gated", () => {
  const ia = read("src/lib/information-architecture.ts");
  const query = read("src/server/queries/dashboard.ts");
  const view = read("src/components/dashboard-workspace.tsx");
  assert.match(ia, /href: "\/dashboard"[^\n]*roles: ALL[^\n]*defaultFor: \["super_admin","finance","manager","purchasing","kitchen","outlet_supervisor","outlet_staff"\]/);
  assert.match(ia, /href: "\/people"[^\n]*defaultFor: \["people_operations"\]/);
  assert.match(query, /isOwner \|\| isFinance/);
  assert.match(query, /getPayablesAttention\(\)/);
  assert.match(query, /isOutlet \? db\.from\("outlet_daily_records"\)/);
  assert.match(view, /data-dashboard-payables/);
  assert.match(view, /data-dashboard-identity/);
  assert.match(view, /data-dashboard-quick-actions/);
  assert.doesNotMatch(view, /Protected controls/);
  assert.match(view, /data-dashboard-actions/);
  assert.match(view, /<ConsoleSection title="Actions" kind="action">/);
  assert.match(view, /tabletRailMode="context"/);
  assert.doesNotMatch(view, /title="Workspace context"|title="Alerts"/);
  assert.match(view, /data-dashboard-pipeline/);
  assert.match(view, /data-dashboard-pipeline className=\{`grid gap-1/);
  assert.doesNotMatch(view, /\[&>\*:nth-child\(even\)\]:border-l/);
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
