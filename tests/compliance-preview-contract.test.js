const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (...parts) => fs.readFileSync(path.join(process.cwd(), ...parts), "utf8");

test("v9.2 separates outlet and People authorization at RLS", () => {
  const sql = read("supabase", "migrations", "229_outlet_people_sales_reconciliation.sql");
  assert.match(sql, /people\.compliance\.status\.read/);
  assert.match(sql, /people\.compliance\.document\.read/);
  assert.match(sql, /outlet_compliance\.upload/);
  assert.match(sql, /target\.subject_kind='staff'/);
  assert.match(sql, /target\.subject_kind='outlet'/);
  assert.match(sql, /r\.role_code in \('finance','purchasing','kitchen','outlet_staff'\)/);
  assert.doesNotMatch(sql, /create table if not exists public\.employees/);
});

test("Kitchen and Outlet cannot read staff compliance or original files", () => {
  const sql = read("supabase", "migrations", "229_outlet_people_sales_reconciliation.sql");
  assert.match(sql, /r\.role_code='outlet_staff'.*outlet_compliance\.upload/s);
  assert.match(sql, /r\.role_code='kitchen'.*outlet_compliance\.read/s);
  const outletGrant = sql.match(/r\.role_code='outlet_staff'[^\n]+/)?.[0] ?? "";
  const kitchenGrant = sql.match(/r\.role_code='kitchen'[^\n]+/)?.[0] ?? "";
  assert.doesNotMatch(outletGrant, /people\.compliance/);
  assert.doesNotMatch(kitchenGrant, /people\.compliance/);
  const route = read("src", "app", "api", "attachments", "[id]", "route.ts");
  assert.match(route, /subject_kind === "staff" \? "people\.compliance\.document\.read"/);
  assert.match(route, /attachment_downloaded/);
});

test("Outlet checklist includes the seven required templates", () => {
  const sql = read("supabase", "migrations", "229_outlet_people_sales_reconciliation.sql");
  for (const code of ["BOMBA","BUSINESS_LICENSE","DBKL","TENANCY_AGREEMENT","INSURANCE","FIRE_EXTINGUISHER","POS_LICENSE"]) assert.match(sql, new RegExp(code));
  assert.match(sql, /outlet_compliance_requirements/);
});

test("sales reconciliation is database-derived and atomic with daily lines", () => {
  const sql = read("supabase", "migrations", "229_outlet_people_sales_reconciliation.sql");
  const progressiveSql = read("supabase", "migrations", "232_outlet_daily_sales_progressive_capture.sql");
  for (const channel of ["duitnow","credit_card","voucher","grabfood","foodpanda"]) assert.match(sql, new RegExp(channel));
  assert.match(sql, /saved_id:=public\.save_outlet_daily_record/);
  assert.match(sql, /difference:=round\(p_pos_total_sales-channel_total,2\)/);
  assert.match(sql, /difference<>0.*sales difference/s);
  const action = read("src", "server", "actions", "outlet-daily-records.ts");
  assert.match(action, /save_outlet_daily_record_v92/);
  assert.match(action, /canUpdateOutletValues/);
  assert.match(action, /isSalesReconciliationMigrationPending/);
  assert.match(action, /Sales reconciliation is temporarily unavailable and was not recorded/);
  assert.doesNotMatch(action, /completion was deferred/);
  assert.match(progressiveSql, /p_target_status='evening_completed'/);
  assert.match(progressiveSql, /POS Total Sales is required before completing this record/);
  assert.match(progressiveSql, /Preserve any existing/);
  const form = read("src", "components", "outlet-daily-record-form.tsx");
  assert.match(form, /hasPosTotal/);
  assert.doesNotMatch(form, /You can save progress now and complete sales before posting/);
  assert.match(form, /Difference reason \(optional\)/);
  assert.match(form, /Channel total[\s\S]*Difference/);
  assert.doesNotMatch(form, /name="pos_total_sales"[^>]+required/);
  const optionalDifferenceSql = read("supabase", "migrations", "250_optional_daily_sales_difference_reason.sql");
  assert.match(optionalDifferenceSql, /sales_review_status=case when difference=0 then 'not_required' else 'needs_review' end/);
  assert.doesNotMatch(optionalDifferenceSql, /difference<>0.*raise exception/s);
  const nonBlockingSql = read("supabase", "migrations", "262_sales_reconciliation_non_blocking.sql");
  assert.match(nonBlockingSql, /-- Sales remains a reconciliation signal/);
  assert.match(nonBlockingSql, /if p_pos_total_sales is null then\s+return saved_id;/);
  assert.match(nonBlockingSql, /sales_review_status=case when difference=0 then 'not_required' else 'needs_review' end/);
});

test("mixed compliance route redirects and module pages remain separate", () => {
  assert.match(read("src","app","(app)","compliance","page.tsx"), /redirect\("\/outlet-compliance"\)/);
  assert.match(read("src","app","(app)","people","[id]","page.tsx"), /Employment & outlet assignments/);
  assert.doesNotMatch(read("src","app","(app)","people","page.tsx"), /Attendance/);
});

test("People profile exposes authorised employment editing and staff document capture", () => {
  const people = read("src","app","(app)","people","[id]","page.tsx");
  const action = read("src","server","actions","compliance.ts");
  assert.doesNotMatch(people, /Edit employment & outlets/);
  assert.match(people, /StaffEmploymentEditor/);
  assert.match(people, /Documents/);
  assert.match(people, /title="Add Record"/);
  assert.match(people, /\{"Save"\}/);
  assert.match(people, /people\.compliance\.document\.read/);
  assert.doesNotMatch(people, /Additional outlets use the existing staff assignment model/);
  assert.match(people, /supporting file/);
  assert.match(action, /value\.subject_kind === "staff"[\s\S]*?\? "people\.compliance\.document\.read"/);
  assert.match(action, /File storage could not accept this upload/);
  assert.match(action, /Nothing was retained; retry after migration 258 is applied/);
  assert.match(action, /logServerError/);
});

test("Preview remains readable before migration 229 is applied", () => {
  const complianceQuery = read("src","server","queries","compliance.ts");
  const outletQuery = read("src","server","queries","outlet-daily-records.ts");
  assert.match(complianceQuery, /PGRST205/);
  assert.match(complianceQuery, /migrationReady/);
  assert.match(outletQuery, /salesError.*PGRST205/);
});

test("compliance type creation is atomic and has an actionable migration guard", () => {
  const migration = read("supabase", "migrations", "261_atomic_compliance_type_creation.sql");
  const action = read("src", "server", "actions", "compliance.ts");
  assert.match(migration, /create or replace function public\.create_compliance_type_atomic/);
  assert.match(migration, /security definer/);
  assert.match(migration, /insert into public\.outlet_compliance_requirements/);
  assert.match(migration, /public\.current_staff_company_id\(\)/);
  assert.match(migration, /public\.has_permission\('compliance\.types\.manage'\)/);
  assert.match(action, /create_compliance_type_atomic/);
  assert.match(action, /migration 261/);
  assert.doesNotMatch(action, /from\("compliance_types"\)\.insert/);
  assert.doesNotMatch(action, /from\("outlet_compliance_requirements"\)\.insert/);
});

test("v9.2 uses the OMS register, progressive checklist and real month calendars", () => {
  const register = read("src","app","(app)","outlet-compliance","page.tsx");
  const checklist = read("src","app","(app)","outlet-compliance","[branchId]","page.tsx");
  const people = read("src","app","(app)","people","[id]","page.tsx");
  const calendar = read("src","components","compliance-month-calendar.tsx");
  assert.match(register, /Compliance register/);
  assert.match(register, /OperationalList/);
  assert.match(register, /tabletCanvas="wide"/);
  assert.match(register, /contentWidth="wide"/);
  assert.match(register, /Compliance portfolio/);
  assert.doesNotMatch(register, /lg:grid-cols-2/);
  assert.match(checklist, /<details/);
  assert.match(checklist, /name="issued_on"/);
  assert.match(checklist, /name="expires_on"/);
  assert.match(checklist, /name="reference_no"/);
  assert.match(checklist, /Checklist temporarily unavailable/);
  assert.match(checklist, /tabletCanvas="wide"/);
  assert.match(people, /WorkspaceGrid/);
  assert.match(people, /lg:grid-cols-2 \[&>section\]:h-full/);
  assert.match(people, /aria-current/);
  assert.doesNotMatch(people, /backHref/);
  assert.match(calendar, /grid-cols-7/);
  assert.match(calendar, /Previous month/);
  assert.match(calendar, /Next month/);
});

test("People Calendar is retired without creating a dead route", () => {
  assert.doesNotMatch(read("src","lib","information-architecture.ts"), /label: "People Calendar"/);
  assert.doesNotMatch(read("src","app","(app)","people","page.tsx"), /People calendar/);
  assert.match(read("src","app","(app)","people","calendar","page.tsx"), /redirect\("\/people"\)/);
});
