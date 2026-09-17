import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("last working date closes access and future scheduling without deleting history", () => {
  const migration = fs.readFileSync("supabase/migrations/304_staff_employment_end_boundary.sql", "utf8");
  assert.match(migration, /add column if not exists employment_end_date date/);
  assert.match(migration, /employment_end_date>=\(now\(\) at time zone 'Asia\/Kuala_Lumpur'\)::date/);
  assert.match(migration, /p_work_date<=s\.employment_end_date/);
  assert.doesNotMatch(migration, /delete from public\.(staffs|shift_assignment_revisions|daily_attendance_results)/);
});

test("staff form and planner expose the date-effective offboarding boundary", () => {
  const form = fs.readFileSync("src/components/foundation-forms.tsx", "utf8");
  const planner = fs.readFileSync("src/components/attendance/schedule-planner.tsx", "utf8");
  const importer = fs.readFileSync("src/components/attendance/schedule-workbook-import.tsx", "utf8");
  assert.match(form, /name="employment_end_date" type="date"/);
  assert.match(planner, /date > person\.employment_end_date/);
  assert.match(planner, /Employment ended/);
  assert.match(importer, /fixed inset-0 m-auto/);
});

test("RESIGN is an HR marker rather than a fabricated schedule assignment", () => {
  const parser = fs.readFileSync("src/lib/attendance/schedule-workbook.ts", "utf8");
  assert.match(parser, /label === "RESIGN"/);
  assert.doesNotMatch(parser, /BLOCKED = new Set\(\["CLEAR OT", "RESIGN"/);
});
