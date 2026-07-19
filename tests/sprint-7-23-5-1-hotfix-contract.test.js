const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("PR review filters and actions are deterministic and role explicit", () => {
  const query = read("src/server/queries/procurement.ts");
  const page = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  const list = read("src/app/(app)/purchase-requests/page.tsx");
  assert.match(query, /status === "in_review" \? \["manager_review", "admin_review", "finance_review"\]/);
  assert.match(query, /if \(statusGroup\.length === 1\) query = query\.eq\("status"/);
  assert.match(query, /if \(statusGroup\.length > 1\) query = query\.in\("status"/);
  for (const role of ["Manager", "Purchasing", "Finance"]) assert.match(page, new RegExp(`Approve as ${role}`));
  assert.match(page, /ConfirmActionForm/);
  assert.doesNotMatch(page, />Review PR</);
  assert.doesNotMatch(list, /<label[^>]*>Priority/);
  assert.match(list, /ariaLabel="Priority"/);
});

test("Manager queue and notifications use company-wide operational scope", () => {
  const roles = read("src/lib/roles.ts");
  const scope = read("src/server/queries/notifications.ts");
  const pending = read("src/server/queries/pending-actions.ts");
  assert.match(roles, /COMPANY_WIDE_OPERATIONAL_ROLES[^\n]*"manager"/);
  assert.match(scope, /hasCompanyWideOperationalScope\(roleCode\)/);
  assert.doesNotMatch(scope, /staffRoles[^\n]*some\([^\n]*branch_id == null/);
  assert.match(pending, /query = query\.in\("branch_id", scope\.branchIds\)/);
  assert.match(scope, /manager: \["manager_review"\]/);
});

test("Recipes are Owner and Finance only while production uses a narrow RPC", () => {
  const ia = read("src/lib/information-architecture.ts");
  const recipeQuery = read("src/server/queries/recipes.ts");
  const productionQuery = read("src/server/queries/production-jobs.ts");
  const migration = read("supabase/migrations/074_daily_record_recipe_access_product_order.sql");
  assert.match(ia, /href: "\/recipes"[\s\S]*roles: \["super_admin", "finance"\]/);
  assert.equal((recipeQuery.match(/requirePermission\("recipes\.view"\)/g) ?? []).length, 3);
  assert.match(migration, /p\.module = 'recipes' and r\.role_code not in \('super_admin', 'finance'\)/);
  assert.match(migration, /create or replace function public\.get_production_recipe_options/);
  assert.match(productionQuery, /rpc\("get_production_recipe_options"\)/);
  assert.doesNotMatch(productionQuery, /from\("recipes"\)/);
});

test("Daily Record field ownership and mobile surfaces match the hotfix", () => {
  const form = read("src/components/outlet-daily-record-form.tsx");
  const detail = read("src/app/(app)/outlet-daily-records/[id]/page.tsx");
  const importFlow = read("src/components/imports/import-workflow.tsx");
  const migration = read("supabase/migrations/074_daily_record_recipe_access_product_order.sql");
  assert.doesNotMatch(form, /<Table|Leftover/);
  for (const label of ["Qty Sent", "Received", "Wastage", "Wastage Reason", "Remarks"]) assert.match(form, new RegExp(label));
  assert.match(form, /canEditQtySent/);
  assert.match(form, /canEditOutletValues/);
  assert.match(detail, /hideMobileConsole=\{!hasPrimaryAction\}/);
  assert.match(importFlow, /RightConsoleMount hideMobileBar/);
  assert.match(migration, /qty_sent = case when can_edit_sent/);
  assert.match(migration, /morning_received_qty = case when can_edit_outlet/);
});

test("canonical product order is seeded and reused", () => {
  const migration = read("supabase/migrations/074_daily_record_recipe_access_product_order.sql");
  const order = read("src/lib/product-order.ts");
  const products = read("src/server/queries/products.ts");
  const daily = read("src/server/queries/outlet-daily-records.ts");
  for (const family of ["SC", "RB", "SRR", "BI", "RT", "BB", "PKG"]) assert.match(order, new RegExp(`"${family}"`));
  assert.match(migration, /SC\(0\[1-9\]\|1\[0-6\]\)/);
  assert.match(migration, /PKG0\[1-6\]/);
  assert.match(products, /sortProductsForDisplay/);
  assert.match(daily, /compareProductDisplayOrder/);
  assert.equal((daily.match(/sortProductsForDisplay/g) ?? []).length >= 2, true);
  assert.match(migration, /display_order, product_code/);
});
