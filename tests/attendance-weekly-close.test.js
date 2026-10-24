const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const migration=fs.readFileSync("supabase/migrations/274_attendance_ot_ro_weekly_close.sql","utf8");
const schedule=fs.readFileSync("src/components/attendance/schedule-planner.tsx","utf8");
const review=fs.readFileSync("src/app/(app)/attendance/review/page.tsx","utf8");
const workbook=fs.readFileSync("src/app/api/attendance/export/route.ts","utf8");

test("OT claims credit RO only after a People decision",()=>{
 for(const contract of ["attendance_ot_claims","submit_attendance_ot_claim","decide_attendance_ot_claim","attendance.ot.approve","source_ot_claim_id","status='credited'"])assert.ok(migration.includes(contract),contract);
 assert.ok(migration.includes("p_requested_minutes%30"));
 assert.ok(migration.includes("p_decided_minutes%30"));
});

test("partial RO is schedule-bound, reserved atomically and allocated FIFO",()=>{
 for(const contract of ["attendance_ro_reservations","ro_original_start","ro_original_end","get_comp_time_available_balance","pg_advisory_xact_lock","comp_time_allocations","order by t.work_date,t.created_at,t.id for update"])assert.ok(migration.includes(contract),contract);
 assert.ok(schedule.includes("Use approved RO"));
 assert.ok(schedule.includes("The amount is reserved when the Manager publishes"));
 assert.ok(!schedule.includes('{key:"ro",label:"RO"'));
});

test("weekly close is People-owned and blocks unresolved source problems",()=>{
 for(const contract of ["attendance.week.close","close_attendance_week_v2","Resolve missing or invalid punches","Decide all submitted OT claims","Every scheduled RO reservation needs a final People decision"])assert.ok(migration.includes(contract),contract);
 assert.ok(review.includes("Review & close week")||review.includes("WeeklyCloseButton"));
});

test("draft reports stay role-gated and only final exports require closed periods",()=>{
 for(const contract of ["attendance.sensitive.export","staff_sensitive_employment","people.sensitive.read"])assert.ok(migration.includes(contract),contract);
 for(const contract of ['input.mode==="final" && draft',"attendance.sensitive.export","branch_id","input.branches","buildPeopleWorkbook","cache-control"])assert.ok(workbook.includes(contract),contract);
});

test("review exposes punch expectations and monthly follow-up",()=>{
 for(const contract of ["expected_punch_count","actual_punch_count","missing_punch_count","monthly_missing_punch_count","overtime_candidate_seconds"])assert.ok(migration.includes(contract),contract);
 for(const label of ["Punches","missing this month","After shift (unapproved)"])assert.ok(review.includes(label),label);
});

test("schedule quick actions and dialog selects remain operable",()=>{
 for(const label of ["OFF","AL","PH","UPL","Working time"])assert.ok(schedule.includes(`label: "${label}"`),label);
 assert.ok(schedule.includes("portalContainer={customDialog.current}"));
 const select=fs.readFileSync("src/components/ui/select-control.tsx","utf8");
 assert.ok(select.includes("<Select.Portal container={portalContainer ?? nativeDialogContainer}>"));
});
