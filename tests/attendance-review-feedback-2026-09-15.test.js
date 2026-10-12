const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const review = fs.readFileSync("src/app/(app)/attendance/review/page.tsx", "utf8");
const actuals = fs.readFileSync("src/components/attendance/actual-attendance-panel.tsx", "utf8");
const importer = fs.readFileSync("src/components/attendance/attendance-import-workflow.tsx", "utf8");
const queries = fs.readFileSync("src/server/queries/attendance.ts", "utf8");
const dashboardQueries = fs.readFileSync("src/server/queries/dashboard.ts", "utf8");
const peopleDetail = fs.readFileSync("src/app/(app)/people/[id]/page.tsx", "utf8");
const employeeSummary = fs.readFileSync("src/components/attendance/employee-attendance-summary.tsx", "utf8");
const closeDialog = fs.readFileSync("src/components/attendance/ot-ro-actions.tsx", "utf8");

test("completed punch imports cannot be submitted twice", () => {
  assert.match(importer, /disabled=\{Boolean\(summary\)\|\|/);
  assert.match(importer, /summary\?"Completed"/);
  assert.match(importer, /Choose another file to start a new import/);
});

test("attendance review separates actual OT display from 30-minute claims", () => {
  assert.match(review, /post_shift_seconds/);
  assert.match(review, /RO\\nOT/);
  assert.match(review, /RO \{reservation \?/);
  assert.match(review, /signedDuration\(actualOvertime, "ot"\)/);
  assert.match(review, /text-\[var\(--sb-success\)\][^>]*>\{candidate >= 1800 \? `\$\{Math\.floor\(candidate \/ 1800\)\} × 00:30`/);
  assert.doesNotMatch(review, /\{prefix\}\{durationLabel\(seconds\)\} OT/);
  assert.match(review, /seconds > 0 && seconds < 60\) return "<00:01"/);
  assert.doesNotMatch(review, /signedMinuteDuration/);
});

test("attendance dialogs keep searchable menus in the modal top layer", () => {
  assert.match(actuals, /portalContainer=\{reportDialog\}/);
  assert.equal((actuals.match(/portalContainer=\{compDialog\}/g) || []).length, 2);
  assert.equal((actuals.match(/sb-dialog-workspace-centered/g) || []).length, 2);
});

test("desktop report tools live in the right rail and warnings wrap", () => {
  assert.match(review, /Reports & time-off balance[\s\S]*?<ActualAttendancePanel[\s\S]*?compact/);
  assert.match(review, /overflow-hidden xl:hidden/);
  assert.doesNotMatch(review, /whitespace-nowrap text-\[10px\] text-amber-800/);
  assert.match(review, /Punch location differs from schedule/);
});

test("attendance reads identify the canonical schedule-week relationship after projection provenance", () => {
  const canonicalRelation = /schedule_weeks!shift_assignment_revisions_schedule_week_id_fkey!inner\(status\)/;
  assert.match(queries, canonicalRelation);
  assert.match(dashboardQueries, canonicalRelation);
  assert.doesNotMatch(queries, /schedule_weeks!inner\(status\)/);
  assert.doesNotMatch(dashboardQueries, /schedule_weeks!inner\(status\)/);
});

test("employee attendance links and unscheduled punches retain the selected employee scope", () => {
  assert.match(peopleDetail, /Open attendance[\s\S]*?employee=\$\{encodeURIComponent\(staff\.full_name\)\}/);
  assert.match(queries, /daily_attendance_results"\)\.select\("staff_id,work_date"\)\.eq\("is_current",true\)/);
  assert.match(queries, /scheduled_branch/);
  assert.match(queries, /const allowedStaff = staffIds \? new Set\(staffIds\) : null/);
  assert.match(queries, /if \(allowedStaff && !allowedStaff\.has\(staffId\)\) continue/);
  assert.doesNotMatch(queries, /const covered = new Set\(reviewRows\.map/);
});

test("attendance review explains close blockers and links to the employee profile", () => {
  assert.match(review, /peopleHref={staff && row\.staff_id \?/);
  assert.match(review, /exceptionCount={exceptionCount}/);
  assert.match(review, /pendingReportCount=/);
  assert.match(review, /submittedClaimCount=/);
  assert.match(employeeSummary, /Open employee/);
  assert.match(employeeSummary, /View full attendance/);
  assert.match(closeDialog, /This week is not ready to close/);
  assert.match(closeDialog, /Review attendance rows/);
});
