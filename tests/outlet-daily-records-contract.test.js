const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const sql = read("supabase/migrations/064_outlet_daily_receiving_wastage.sql");
const validationFix = read("supabase/migrations/065_fix_outlet_evening_completion_validation.sql");
const hotfix = read("supabase/migrations/074_daily_record_recipe_access_product_order.sql");
const actions = read("src/server/actions/outlet-daily-records.ts");
const errorHandling = read("src/server/actions/error-handling.ts");
const query = read("src/server/queries/outlet-daily-records.ts");
const form = read("src/components/outlet-daily-record-form.tsx");
const page = read("src/app/(app)/outlet-daily-records/page.tsx");
const detail = read("src/app/(app)/outlet-daily-records/[id]/page.tsx");
const inlineValidation = read("supabase/migrations/167_inline_outlet_daily_validation_context.sql");
const qtySentGuard = read("supabase/migrations/191_guard_outlet_completion_qty_sent.sql");
const qtySentRoles = read("supabase/migrations/192_grant_qty_sent_to_kitchen_above.sql");
const kitchenDailyVisibility = read("supabase/migrations/193_grant_kitchen_outlet_daily_visibility.sql");
const kitchenDailyRls = read("supabase/migrations/194_fix_kitchen_outlet_daily_rls_scope.sql");
const kitchenOutletBranchRead = read("supabase/migrations/195_allow_kitchen_outlet_branch_read.sql");
const permissions = read("src/server/auth/permissions.ts");
const outletDailyE2e = read("tests/e2e/purchasing-outlet-daily-access.spec.js");

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

test("ready and posted outlet records retain separate operator-facing labels", () => {
  const statusLabels = read("src/lib/status-label.ts");
  assert.match(statusLabels, /evening_completed: "Ready to post"/);
  assert.match(statusLabels, /reviewed: "Posted"/);
  assert.doesNotMatch(read("src/app/(app)/outlet-daily-records/page.tsx"), /Posted · editable/);
});

test("outlet completion creates the controlled ready-to-post queue", () => {
  const page = read("src/app/(app)/outlet-daily-records/page.tsx");
  assert.match(query, /posted_today: Number\(summary\.posted_today\)/);
  assert.match(query, /rpc\("get_outlet_daily_today_summary", \{ p_record_date: today \}\)/);
  assert.match(query, /const \[pageResult, summaryResult\] = await Promise\.all\(\[loadRows\(filters\), summaryPromise\]\)/);
  assert.match(query, /missing_evening: Number\(summary\.missing_evening\)/);
  assert.match(query, /ready_to_post: Number\(summary\.ready_to_post\)/);
  assert.match(page, /<dt className="text-\[10px\] text-muted-foreground">Posted<\/dt>/);
  assert.match(page, /Ready to post/);
  assert.doesNotMatch(page, /<StatusBadge status=\{progress\.status\} \/><p/);
});

test("Outlet Daily today summary is one constant-size RLS-preserving database read", () => {
  const migration = read("supabase/migrations/310_outlet_daily_today_summary.sql");
  assert.match(migration, /create or replace function public\.get_outlet_daily_today_summary\(p_record_date date\)/);
  assert.match(migration, /language sql[\s\S]*stable/);
  assert.doesNotMatch(migration, /security definer/);
  assert.match(migration, /grant execute on function public\.get_outlet_daily_today_summary\(date\) to authenticated/);
  assert.match(migration, /where r\.record_date = p_record_date[\s\S]*r\.status <> 'void'/);
});

test("new outlet daily saves route existing outlet-days back to their authoritative record", () => {
  const action = read("src/server/actions/outlet-daily-records.ts");
  assert.match(action, /\.from\("outlet_daily_records"\)[\s\S]*\.eq\("branch_id", payload\.branch_id\)[\s\S]*\.eq\("record_date", payload\.record_date\)/);
  assert.match(action, /\.neq\("status", "void"\)/);
  assert.match(action, /A record already exists for this outlet and date/);
});

test("new outlet defaults cannot carry an invalid unremarked wastage forward", () => {
  assert.match(query, /const received = receivedValueIsTrusted\(line\) \? Number\(line\.morning_received_qty\) : null/);
  assert.match(query, /const safeWastage = wastage > 0 && \(received === null \|\| wastage > received\) && !hasRemark \? 0/);
  assert.match(query, /wastage_reason: safeWastage === 0 \? null/);
  assert.match(read("src/server/actions/error-handling.ts"), /Wastage cannot exceed Received without a line remark/);
});

test("wastage validation preserves a safe product anchor for inline correction", () => {
  assert.match(inlineValidation, /select p\.product_name, p\.product_code into product_name, product_code/);
  assert.match(inlineValidation, /Wastage for "%" \(%\) cannot exceed received without a line remark/);
  assert.match(form, /const validationProductCode/);
  assert.match(form, /Boolean\(validationHint\)/);
});

test("Outlet completion cannot post while Qty Sent is missing", () => {
  assert.match(qtySentGuard, /create or replace function public\.save_outlet_daily_record/);
  assert.match(qtySentGuard, /p_target_status in \('morning_recorded','evening_completed'\)/);
  assert.match(qtySentGuard, /QTY_SENT_MISSING: Qty Sent is missing for/);
  assert.match(qtySentGuard, /qty_sent_confirmed into existing_sent_confirmed/);
  assert.match(qtySentGuard, /Kitchen or authorised company-wide user must confirm Qty Sent/);
  assert.match(errorHandling, /qty_sent_missing/);
});

test("concurrent outlet-day creation converges on the unique existing record", () => {
  assert.match(actions, /error\?\.code === "23505" && !recordId/);
  assert.match(actions, /This outlet-day already exists\. Continue from the existing record\./);
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

test("outlet daily routes are wired under Outlet Management", () => {
  const nav = read("src/lib/information-architecture.ts");
  const routes = read("src/server/auth/route-permissions.ts");
  for (const file of [
    "src/app/(app)/outlet-daily-records/page.tsx",
    "src/app/(app)/outlet-daily-records/new/page.tsx",
    "src/app/(app)/outlet-daily-records/[id]/page.tsx",
  ]) assert.equal(fs.existsSync(file), true);
  assert.match(nav, /href: "\/outlet-daily-records"[\s\S]*group: "outlet_management"/);
  assert.match(routes, /"\/outlet-daily-records\/new": \["outlet_daily_record\.create"\]/);
  assert.match(routes, /\.\.\.informationArchitecture\.map/);
});

test("release footer matches Sprint 7.13", () => {
  const version = read("src/lib/app-version.ts");
  assert.match(version, /APP_VERSION = "\d+\.\d+\.\d+"/);
  assert.match(version, /APP_SPRINT = `v\$\{APP_VERSION\}`/);
});

test("received totals never turn an unverified default zero into a business fact", () => {
  assert.match(query, /type ReceivedProvenance = Pick<LineRow, "morning_received_qty" \| "qty_sent_estimated">/);
  assert.match(query, /typeof line\.morning_received_provided === "boolean"/);
  assert.match(query, /line\.qty_sent_estimated !== null \|\| received !== 0/);
  assert.doesNotMatch(query, /provided = .*qty_sent_source/);
  assert.match(query, /\.range\(start, start \+ pageSize - 1\)/);
  assert.match(query, /\.in\("record_id", recordIds\)/);
  assert.match(query, /received_state: "verified" \| "unavailable"/);
  assert.match(query, /received_pending_lines: number/);
  assert.match(query, /total_received: number \| null/);
  assert.match(query, /today_received_unavailable/);
  const summaryMigration = read("supabase/migrations/310_outlet_daily_today_summary.sql");
  assert.match(summaryMigration, /count\(l\.id\) as line_count/);
  assert.match(summaryMigration, /bool_and\(coalesce\(l\.morning_received_provided, false\)\) as received_verified/);
  assert.match(query, /morning_received_provided: receivedValueIsTrusted\(line\)/);
  assert.match(query, /morning_received_qty: receivedValueIsTrusted\(line\) \? line\.morning_received_qty : null/);
  assert.match(form, /receivedIsKnown && source\?\.morning_received_qty != null/);
  assert.match(form, /placeholder=\{receivedIsKnown \? undefined : "Not verified"\}/);
});

test("Qty Sent totals never turn an unavailable default zero into a business fact", () => {
  assert.match(query, /total_sent: number \| null/);
  assert.match(query, /const qtySentState = lines\.length > 0 && lines\.every/);
  assert.match(query, /const totalSent = qtySentState === "confirmed"/);
  assert.match(query, /totalReceived === 0 && totalSent !== null && totalSent > 0/);
  const summaryMigration = read("supabase/migrations/310_outlet_daily_today_summary.sql");
  assert.match(summaryMigration, /when bool_and\(total_sent is not null\) then coalesce\(sum\(total_sent\), 0\)/);
  assert.match(summaryMigration, /when count\(\*\) > 0 and bool_and\(total_received is not null\)/);
  assert.match(page, /data\.summary\.today_sent === null \? "Unavailable"/);
  assert.match(detail, /record\.total_sent === null \? "Pending"/);
  assert.match(detail, /Needs confirmation/);
});

test("outlet daily source failures never render an empty zero dashboard", () => {
  assert.match(page, /page\.outletDailyRecords\.source/);
  assert.match(page, /Outlet daily data unavailable/);
  assert.match(page, /no zero totals are shown/);
  assert.match(page, /href=\"\/outlet-daily-records\"/);
});

test("outlet daily list aggregates line rows by record before rendering", () => {
  assert.match(query, /const linesByRecord = new Map<string, LineRow\[\]>\(\)/);
  assert.match(query, /linesByRecord\.get\(line\.record_id\)/);
  assert.match(query, /totals\(linesByRecord\.get\(record\.id\) \?\? \[\], operationalProductIds\)/);
  assert.doesNotMatch(query, /totals\(\(lines \?\? \[\]\) as LineRow\[\]\)\.filter\(\(line\) => line\.record_id === record\.id\)/);
});

test("outlet daily detail fails closed when its record source cannot be verified", () => {
  assert.match(query, /if \(branchesError\) throw new Error/);
  assert.match(query, /if \(productsError\) throw new Error/);
  assert.match(query, /if \(staffsError\) throw new Error/);
  assert.match(detail, /page\.outletDailyRecords\.detail/);
  assert.match(detail, /Outlet daily record unavailable/);
  assert.match(detail, /No receipt or wastage totals are shown as zero/);
  assert.match(detail, /Retry record/);
});

test("outlet records flag a confirmed zero when stock was sent", () => {
  assert.match(query, /received_zero_with_sent: boolean/);
  assert.match(query, /totalReceived === 0 && totalSent !== null && totalSent > 0/);
  assert.match(page, /0 · verify/);
  assert.match(page, /no receipt quantity has been confirmed/);
  assert.match(detail, /Receipt check needed/);
  assert.match(detail, /record\.received_zero_with_sent/);
});

test("Outlet cannot enter Qty Sent; only the dedicated permission unlocks it", () => {
  assert.match(detail, /getPermissionMap\(\["outlet_daily_record\.update", "outlet_daily_record\.qty_sent", "outlet_daily_record\.post", "outlet_daily_record\.void"\]\)/);
  assert.match(detail, /const canEditQtySent = !statusLocked && permissions\["outlet_daily_record\.qty_sent"\]/);
  assert.match(form, /name="qty_sent"[\s\S]*disabled=\{locked \|\| !canEditQtySent\}/);
  assert.match(form, /data-qty-sent-ownership/);
  assert.match(form, /Only Kitchen and authorised company-wide staff can enter it/);
  assert.match(form, /aria-describedby=\{!canEditQtySent \? "qty-sent-ownership-note"/);
  assert.match(qtySentGuard, /can_edit_sent boolean := public\.has_permission\('outlet_daily_record\.qty_sent'\)/);
  assert.match(qtySentGuard, /if can_edit_sent then/);
});

test("missing Qty Sent keeps Outlet entry editable and changes completion into a draft save", () => {
  const newPage = read("src/app/(app)/outlet-daily-records/new/page.tsx");
  assert.match(form, /name="morning_received_qty"[\s\S]*disabled=\{locked \|\| !canEditOutletValues\}/);
  assert.match(form, /name="wastage_qty"[\s\S]*disabled=\{locked \|\| !canEditOutletValues\}/);
  assert.match(newPage, /needsKitchenQtySent = canEnterOutlet && !canEditQtySent/);
  assert.match(newPage, /value="draft"[\s\S]*Save Outlet Entry/);
  assert.match(newPage, /Received and Wastage remain editable/);
  assert.match(errorHandling, /Enter Qty Sent before confirming this record/);
  assert.doesNotMatch(errorHandling, /You can still enter Received and Wastage and save this record as a draft/);
});

test("Qty Sent ownership is Kitchen and above, never Outlet", () => {
  assert.match(qtySentRoles, /r\.role_code in \('manager', 'purchasing', 'finance'\)/);
  assert.match(qtySentRoles, /outlet_daily_record\.qty_sent/);
  assert.match(qtySentRoles, /on conflict \(role_id, permission_id\) do nothing/);
  assert.doesNotMatch(qtySentRoles, /outlet_staff/);
  assert.doesNotMatch(qtySentRoles, /kitchen_staff/);
});

test("Kitchen can see outlet daily records before confirming Qty Sent", () => {
  assert.match(kitchenDailyVisibility, /r\.role_code = 'kitchen'/);
  assert.match(kitchenDailyVisibility, /outlet_daily_record\.view_all/);
  assert.match(kitchenDailyVisibility, /outlet_daily_record\.qty_sent/);
  assert.match(kitchenDailyVisibility, /on conflict \(role_id, permission_id\) do nothing/);
  assert.doesNotMatch(kitchenDailyVisibility, /outlet_staff/);
});

test("Kitchen visibility is scoped to Outlet Daily instead of broadening tenant RLS", () => {
  assert.match(kitchenDailyRls, /drop policy if exists "tenant outlet daily records"/);
  assert.match(kitchenDailyRls, /public\.can_access_outlet_daily_branch\(branch_id\)/);
  assert.match(kitchenDailyRls, /drop policy if exists "tenant outlet daily record lines"/);
  assert.match(kitchenDailyRls, /public\.can_access_outlet_daily_branch\(r\.branch_id\)/);
  assert.doesNotMatch(kitchenDailyRls, /can_access_company_branch\(/);
});

test("Kitchen can resolve outlet branch labels without generic branch access", () => {
  assert.match(kitchenOutletBranchRead, /drop policy if exists "tenant kitchen outlet branches read"/);
  assert.match(kitchenOutletBranchRead, /branch_type = 'outlet'/);
  assert.match(kitchenOutletBranchRead, /outlet_daily_record\.view_all/);
  assert.match(kitchenOutletBranchRead, /current_staff_company_id\(\)/);
  assert.doesNotMatch(kitchenOutletBranchRead, /branches\.update|branches\.create/);
});

test("the role matrix keeps Qty Sent ownership above Outlet in local and mock mode", () => {
  for (const role of ["finance", "manager", "purchasing", "kitchen"]) {
    const roleBlock = permissions.match(new RegExp(`${role}: \\[([\\s\\S]*?)\\]`))?.[1] ?? "";
    assert.match(roleBlock, /outlet_daily_record\.qty_sent/);
  }
  const outletBlock = permissions.match(/outlet_staff: \[([\s\S]*?)\]/)?.[1] ?? "";
  assert.doesNotMatch(outletBlock, /outlet_daily_record\.qty_sent/);
});

test("the local role fixture covers Kitchen Qty Sent ownership without outlet-value writes", () => {
  assert.match(outletDailyE2e, /Kitchen confirms Qty Sent while Outlet-owned values stay read-only/);
  assert.match(outletDailyE2e, /getByRole\("spinbutton", \{ name: \/Purchasing Access Product qty sent/);
  assert.match(outletDailyE2e, /expect\(received\)\.toBeDisabled\(\)/);
  assert.match(outletDailyE2e, /expect\(wastage\)\.toBeDisabled\(\)/);
  assert.match(outletDailyE2e, /qty_sent_source\)\.toBe\("authorized_confirmed"\)/);
});

test("outlet list keeps updated date and time readable instead of concatenating them", () => {
  assert.match(page, /formatDateTime\(row\.updated_at\)\.split\(" "\)\.map\(\(part, index\)/);
  assert.match(page, /className=\{index === 0 \? "block" : "block text-xs text-muted-foreground"\}/);
});
