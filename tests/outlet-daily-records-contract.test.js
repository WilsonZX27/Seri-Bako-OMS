const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const sql = read("supabase/migrations/064_outlet_daily_receiving_wastage.sql");
const validationFix = read("supabase/migrations/065_fix_outlet_evening_completion_validation.sql");
const hotfix = read("supabase/migrations/074_daily_record_recipe_access_product_order.sql");
const actions = read("src/server/actions/outlet-daily-records.ts");
const query = read("src/server/queries/outlet-daily-records.ts");
const form = read("src/components/outlet-daily-record-form.tsx");

test("operational date reads use the Kuala Lumpur business day", () => {
  const date = read("src/lib/business-date.ts");
  const dashboard = read("src/server/queries/dashboard.ts");
  const outlet = read("src/server/queries/outlet-daily-records.ts");
  assert.match(date, /timeZone: "Asia\/Kuala_Lumpur"/);
  assert.match(dashboard, /const today = todayInKualaLumpur\(\)/);
  assert.doesNotMatch(dashboard, /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/);
  assert.match(outlet, /import \{ todayInKualaLumpur \} from "@\/lib\/business-date"/);
});

test("migration 064 creates the daily header and product lines", () => {
  assert.match(sql, /create table if not exists public\.outlet_daily_records/);
  assert.match(sql, /create table if not exists public\.outlet_daily_record_lines/);
  assert.match(sql, /product_id uuid not null references public\.products/);
  assert.match(sql, /outlet_daily_active_branch_date_idx/);
  assert.match(sql, /where status <> 'void'/);
});

test("workflow, quantity and reviewed-lock rules are server authoritative", () => {
  for (const status of ["draft", "morning_recorded", "evening_completed", "reviewed", "void"]) assert.match(sql, new RegExp(`'${status}'`));
  assert.match(sql, /Quantities must be non-negative/);
  assert.match(sql, /leftover_qty \+ line_wastage_qty > received_qty/);
  assert.match(sql, /A line note is required/);
  assert.match(sql, /Reviewed or void records are locked/);
  assert.match(sql, /Only an evening-completed record can be reviewed/);
  assert.match(sql, /Void reason is required/);
});

test("the current form uses sent, received, wastage, reason and remarks without leftover", () => {
  assert.match(sql, /p_target_status = 'evening_completed' and \(not \(line \? 'evening_leftover_qty'\)/);
  assert.match(validationFix, /coalesce\(nullif\(line ->> 'evening_leftover_qty', ''\)::numeric, 0\)/);
  assert.match(validationFix, /p_target_status = 'evening_completed'[\s\S]*nullif\(trim\(coalesce\(line ->> 'evening_leftover_qty', ''\)\), ''\) is null/);
  assert.match(validationFix, /p_target_status = 'evening_completed'[\s\S]*nullif\(trim\(coalesce\(line ->> 'wastage_qty', ''\)\), ''\) is null/);
  assert.doesNotMatch(form, /Leftover|evening_leftover_qty/);
  for (const field of ["qty_sent", "morning_received_qty", "wastage_qty", "wastage_reason", "line_notes"]) assert.match(form, new RegExp(`name="${field}"`));
  assert.match(hotfix, /qty_sent numeric\(18,4\)/);
});

test("lite polish keeps line entry searchable and outlet defaults unambiguous", () => {
  const newPage = read("src/app/(app)/outlet-daily-records/new/page.tsx");
  assert.match(form, /<span className="sr-only">Find product<\/span>/);
  assert.match(form, /placeholder="Find product"/);
  assert.match(form, /matches \? "" : "hidden"/);
  assert.match(query, /defaultBranchId: allowedBranches\.some/);
  assert.match(query, /allowedBranches\.length === 1/);
  assert.match(newPage, /branchId=\{selectedBranchId\}/);
});

test("active staff, permissions, company and assigned branch are checked inside RPCs", () => {
  assert.match(sql, /auth_user_id = auth\.uid\(\).*status = 'active'/s);
  assert.match(sql, /company_id = actor\.company_id/);
  assert.match(sql, /public\.staff_branches/);
  assert.match(sql, /outlet_daily_record\.view_all/);
  for (const permission of ["create", "update", "review", "void"]) assert.match(sql, new RegExp(`outlet_daily_record\\.${permission}`));
  assert.match(sql, /security definer/g);
  assert.equal((sql.match(/set search_path = public/g) ?? []).length, 3);
});

test("completed outlet records use the operator-facing Posted label", () => {
  const statusLabels = read("src/lib/status-label.ts");
  assert.match(statusLabels, /evening_completed: "Posted"/);
  assert.match(read("src/app/(app)/outlet-daily-records/page.tsx"), /status === "evening_completed" \? "Posted · editable"/);
});

test("outlet completion does not create a fictitious review queue", () => {
  const page = read("src/app/(app)/outlet-daily-records/page.tsx");
  assert.match(query, /posted_today: todayRows\.filter\(\(row\) => \["evening_completed", "reviewed"\]\.includes\(row\.status\)\)\.length/);
  assert.match(page, /Posted today/);
  assert.doesNotMatch(page, /Ready to post/);
});

test("new outlet daily saves route existing outlet-days back to their authoritative record", () => {
  const action = read("src/server/actions/outlet-daily-records.ts");
  assert.match(action, /\.from\("outlet_daily_records"\)[\s\S]*\.eq\("branch_id", payload\.branch_id\)[\s\S]*\.eq\("record_date", payload\.record_date\)/);
  assert.match(action, /\.neq\("status", "void"\)/);
  assert.match(action, /A record already exists for this outlet and date/);
});

test("daily capture never writes stock, production, AP or cash-flow records", () => {
  const implementation = `${sql}\n${actions}\n${query}`;
  assert.doesNotMatch(implementation, /(insert into|update|delete from) public\.(stock_transactions|stock_transaction_lines|stock_balances|production_jobs|supplier_invoices|supplier_invoice_payments)/i);
  assert.doesNotMatch(implementation, /get_ap_aging_report|cash-flow/);
});

test("migration 065 only replaces the save RPC validation", () => {
  assert.match(validationFix, /create or replace function public\.save_outlet_daily_record/);
  assert.match(validationFix, /security definer[\s\S]*set search_path = public/);
  assert.doesNotMatch(validationFix, /create table|alter table|create type/i);
  assert.doesNotMatch(validationFix, /(insert into|update|delete from) public\.(stock_transactions|stock_transaction_lines|stock_balances|production_jobs|supplier_invoices)/i);
});

test("only the requested routes and operations navigation are wired", () => {
  const nav = read("src/lib/information-architecture.ts");
  const routes = read("src/server/auth/route-permissions.ts");
  for (const file of [
    "src/app/(app)/outlet-daily-records/page.tsx",
    "src/app/(app)/outlet-daily-records/new/page.tsx",
    "src/app/(app)/outlet-daily-records/[id]/page.tsx",
  ]) assert.equal(fs.existsSync(file), true);
  assert.match(nav, /href: "\/outlet-daily-records"[\s\S]*group: "operations"/);
  assert.match(routes, /"\/outlet-daily-records\/new": \["outlet_daily_record\.create"\]/);
  assert.match(routes, /\.\.\.informationArchitecture\.map/);
});

test("release footer matches Sprint 7.13", () => {
  const version = read("src/lib/app-version.ts");
  assert.match(version, /APP_VERSION = "\d+\.\d+\.\d+"/);
  assert.match(version, /APP_SPRINT = `v\$\{APP_VERSION\}`/);
});

test("received totals never turn an unverified default zero into a business fact", () => {
  assert.match(query, /qty_sent_estimated !== null \|\| received !== 0/);
  assert.match(query, /received_state: "verified" \| "unavailable"/);
  assert.match(query, /total_received: number \| null/);
  assert.match(query, /today_received_unavailable/);
});
