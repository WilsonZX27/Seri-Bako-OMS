const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");
const review = read("src/app/(app)/attendance/review/page.tsx");
const filters = read("src/components/attendance/attendance-review-filters.tsx");
const planner = read("src/components/attendance/schedule-planner.tsx");
const api = read("src/app/api/attendance/schedule/route.ts");
const migration = read(
  "supabase/migrations/279_schedule_atomic_submit_manager_edit.sql",
);
const importer = read("scripts/attendance/import_schedule_workbook.py");
const workbookImportUi = read("src/components/attendance/schedule-workbook-import.tsx");
const workbookParser = read("src/lib/attendance/schedule-workbook.ts");

function tsxFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory()
      ? tsxFiles(path)
      : entry.name.endsWith(".tsx")
        ? [path]
        : [];
  });
}

test("Actual Attendance uses responsive grouped views and hides payroll diagnostics", () => {
  for (const contract of [
    "AttendanceReviewFilters",
    "newDay",
    "md:hidden",
    "actual_punch_count",
    "expected_punch_count",
  ])
    assert.match(review, new RegExp(contract));
  assert.doesNotMatch(
    review,
    /Calculation audit|One staff day per row|Times preserve NGTeco seconds/,
  );
  assert.doesNotMatch(review, />Payable</);
  assert.match(filters, /Apply filters/);
  assert.match(filters, /Reset/);
});

test("schedule submit and Manager correction are atomic, audited and reason-bound", () => {
  assert.doesNotMatch(planner, /window\.prompt/);
  for (const contract of [
    "submit_schedule_week_atomic",
    "edit_and_publish_schedule_week",
    "A return reason is required",
    "Manager correction reason is required",
  ])
    assert.match(`${api}\n${migration}`, new RegExp(contract));
  assert.match(migration, /before_state,after_state/);
  assert.match(planner, /Unsaved changes will be saved when you submit/);
});

test("annotated Attendance controls use the shared select authority", () => {
  for (const path of [
    "src/components/attendance/attendance-review-filters.tsx",
    "src/components/attendance/schedule-planner.tsx",
    "src/components/attendance/mapping-admin.tsx",
    "src/components/attendance/template-admin.tsx",
  ])
    assert.doesNotMatch(
      read(path),
      /<select\b/,
      `${path} must not add a native select`,
    );
  assert.match(read("src/components/ui/select-control.tsx"), /searchable/);
});

test("business UI cannot add native selects outside the legacy wrapper", () => {
  const offenders = tsxFiles("src").filter(
    (path) =>
      path !== "src/components/ui/select-native.tsx" &&
      /<select\b/.test(read(path)),
  );
  assert.deepEqual(offenders, []);
});

test("workbook importer accepts an explicit Monday window and fails closed", () => {
  for (const contract of [
    "DEFAULT_WEEK_START",
    '"--week-start"',
    "week_start must be a Monday",
    "CLEAR OT",
    "RESIGN",
    "LATE",
    "suspicious_time_span",
    "published_or_locked_week",
    "cross_outlet_employee",
    "work_site_label",
    "source_sha256",
    "ready_for_authenticated_draft_import",
  ])
    assert.match(importer, new RegExp(contract));
  assert.match(migration, /unique\(company_id,week_start,file_hash\)/);
  assert.match(migration, /Published or locked schedules cannot be replaced/);
  assert.match(migration, /p_unresolved_count<>0/);
  assert.match(read("src/app/api/attendance/schedule/import-catalog/route.ts"), /work_site_label/);
});

test("schedule workbook UI previews live identities and imports only verified editable outlets", () => {
  for (const contract of ["import-catalog", "parseScheduleWorkbook", "sourceIssues", "Published rosters were unchanged", "flagged cells stay empty"])
    assert.match(workbookImportUi, new RegExp(contract, "i"));
  for (const contract of ["home_branch_id", "multiple_destination_shifts", "unattached_schedule_note", "suspicious_time_span", "needs a destination shift time"])
    assert.match(workbookParser, new RegExp(contract));
  for (const contract of ["MAX_WORKBOOK_BYTES", "MAX_XML_BYTES", "MAX_TOTAL_XML_BYTES"])
    assert.match(workbookParser, new RegExp(contract));
  assert.match(read("src/app/api/attendance/schedule/import-catalog/route.ts"), /home_branch_id/);
  assert.match(read("src/app/api/attendance/schedule/import-catalog/route.ts"), /default_branch_id/);
  assert.match(read("src/app/api/attendance/schedule/import-catalog/route.ts"), /outlet_supervisor/);
  assert.match(read("src/components/attendance/schedule-workbook-import.tsx"), /Partial draft/);
});

test("staff detail leads with the profile and removes the redundant helper paragraph", () => {
  const staff = read("src/app/(app)/staffs/[id]/page.tsx");
  assert.match(staff, /Open profile[\s\S]*Current Status/);
  assert.doesNotMatch(
    staff,
    /Update staff identity, access, and account actions/,
  );
});
