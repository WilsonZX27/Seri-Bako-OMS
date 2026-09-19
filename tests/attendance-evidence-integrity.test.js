const fs = require("node:fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const migration = fs.readFileSync("supabase/migrations/306_attendance_evidence_integrity.sql", "utf8");
const currentSummaryMigration = fs.readFileSync("supabase/migrations/311_attendance_current_exception_summary.sql", "utf8");
const reviewRoute = fs.readFileSync("src/app/api/attendance/review/route.ts", "utf8");
const reviewActions = fs.readFileSync("src/components/attendance/review-actions.tsx", "utf8");
const queries = fs.readFileSync("src/server/queries/attendance.ts", "utf8");
const attendancePage = fs.readFileSync("src/app/(app)/attendance/page.tsx", "utf8");

test("attendance calculation debounces repeat punches without deleting evidence", () => {
  assert.match(migration, /occurred_at-previous_at>interval '5 minutes'/);
  assert.match(migration, /'raw_punch_count'/);
  assert.match(migration, /'deduplicated_punch_count'/);
  assert.match(migration, /'dedupe_window_seconds',300/);
  assert.doesNotMatch(migration, /delete from public\.attendance_raw_punch_events/);
});

test("scheduled days remain visible when an import has no punches", () => {
  assert.match(migration, /'scheduled_without_punches',r\.actual_first_in is null/);
  assert.doesNotMatch(migration, /set is_current=false[^;]+suppressed_missing_punch_result/);
});

test("three-punch inference is limited to full-time shifts with a credible checkout", () => {
  assert.match(migration, /a\.employment_type='full_time' and point_count=3/);
  assert.match(migration, /last_out>=shift_start\+\(\(shift_end-shift_start\)\*0\.66\)/);
  assert.match(migration, /'system_inferred_break'/);
  assert.match(migration, /greatest\(a\.planned_break_seconds,3600\)/);
});

test("a single punch is assigned to only the nearest scheduled boundary", () => {
  assert.match(migration, /if point_count=1 then/);
  assert.match(migration, /abs\(extract\(epoch from points\[1\]-shift_start\)\)<=abs\(extract\(epoch from shift_end-points\[1\]\)\)/);
  assert.match(migration, /first_in:=points\[1\]; last_out:=null/);
  assert.match(migration, /first_in:=null; last_out:=points\[1\]/);
});

test("People can audit and correct break out and break in", () => {
  for (const source of [migration, reviewRoute, reviewActions]) {
    assert.match(source, /actual_break_out|actualBreakOut/);
    assert.match(source, /actual_break_in|actualBreakIn/);
  }
  assert.match(migration, /Break out and break in must be supplied together/);
  assert.match(reviewActions, /Original fingerprint evidence stays unchanged/);
  assert.match(migration, /after_state=to_jsonb\(revised\)/);
});

test("attendance home uses one bounded database summary instead of loading raw punches", () => {
  assert.match(queries, /rpc\("get_attendance_workspace_summary"/);
  assert.match(migration, /create or replace function public\.get_attendance_workspace_summary/);
  const workspaceBody = queries.slice(queries.indexOf("export async function getAttendanceWorkspace"), queries.indexOf("export async function getSchedulePlanner"));
  assert.doesNotMatch(workspaceBody, /attendance_raw_punch_events/);
  assert.doesNotMatch(workspaceBody, /hasPermission/);
  assert.match(attendancePage, /<Suspense[\s\S]+Loading your published schedule/);
});

test("attendance home excludes superseded calculation exceptions", () => {
  assert.match(currentSummaryMigration, /r\.is_current/);
  assert.match(currentSummaryMigration, /count\(distinct e\.result_id\)/);
  assert.match(currentSummaryMigration, /attendance_exceptions_open_company_result_idx/);
  assert.match(currentSummaryMigration, /where resolved_at is null/);
  assert.match(currentSummaryMigration, /r\.work_date between p_week_start and week_end/);
});
