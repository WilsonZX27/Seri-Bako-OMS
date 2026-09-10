const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const migration=fs.readFileSync("supabase/migrations/273_schedule_validation_and_raw_punch_files.sql","utf8");
const route=fs.readFileSync("src/app/api/attendance/schedule/route.ts","utf8");
const importRoute=fs.readFileSync("src/app/api/attendance/imports/confirm/route.ts","utf8");
const planner=fs.readFileSync("src/components/attendance/schedule-planner.tsx","utf8");
const review=fs.readFileSync("src/app/(app)/attendance/review/page.tsx","utf8");

test("weekly rest is a named audited warning while real schedule blockers remain",()=>{
 assert.match(migration,/validate_schedule_week/);
 assert.match(migration,/'no_weekly_rest'/);
 assert.match(migration,/warning_note/);
 assert.doesNotMatch(migration,/raise exception 'Every scheduled employee requires/);
 for(const blocker of ["inactive_staff","cross_branch_collision","not_editable","no_assignments"])assert.match(migration,new RegExp(blocker));
 assert.match(route,/submit_schedule_week_atomic/);
 assert.match(planner,/Schedule submitted with/);
});

test("People Operations schedule reads use branch scope without edit authority",()=>{
 assert.match(migration,/public\.has_permission\('schedule\.read'\)/);
 assert.match(migration,/public\.can_access_company_branch/);
  assert.doesNotMatch(migration,/s\.id=public\.current_staff_id\(\) or public\.has_any_permission/);
  assert.match(migration,/role_code text/);
  assert.match(migration,/schedule_week_id=p_week_id/);
});

test("raw punch files are multi-week and Timecard cannot enter the import API",()=>{
 assert.match(importRoute,/z\.literal\("view_attendance_punch"\)/);
 assert.match(importRoute,/finalise_attendance_punch_file/);
 assert.doesNotMatch(importRoute,/Clock In|Clock Out|timecardPunches/);
 assert.match(migration,/date_trunc\('week'/);
 assert.match(migration,/excluded_from_calculation=true/);
 assert.match(migration,/suppressed_missing_punch_result/);
 assert.match(migration,/coverageByDate/);
});

test("attendance surfaces use the shared AM PM formatter",()=>{
 assert.match(planner,/formatAttendanceTime/);
 assert.match(review,/formatAttendanceTime/);
 assert.doesNotMatch(review,/hourCycle:"h23"/);
});
