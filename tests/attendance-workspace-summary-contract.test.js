const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const queries = fs.readFileSync("src/server/queries/attendance.ts", "utf8");

test("attendance overview counts bounded weekly work in the database", () => {
  for (const table of ["shift_change_requests", "attendance_exceptions", "daily_attendance_reports", "attendance_period_locks"]) {
    assert.match(
      queries,
      new RegExp(`from\\(\\"${table}\\"\\)\\.select\\([^\\n]+count: \\"exact\\", head: true`),
      `${table} must use an exact head count instead of downloading rows`,
    );
  }
  assert.match(queries, /attendance_exceptions_result_id_fkey!inner\(work_date\)/);
  assert.match(queries, /gte\("daily_attendance_results\.work_date", weekStart\)/);
  assert.match(queries, /lte\("daily_attendance_results\.work_date", weekEndDate\)/);
  assert.match(queries, /unresolvedExceptions: exceptions\.count \?\? 0/);
  assert.doesNotMatch(queries, /unresolvedExceptions: \(exceptions\.data \?\? \[\]\)\.length/);
});

test("attendance overview requests only the latest import metadata row", () => {
  assert.match(queries, /attendance_import_batches[\s\S]*?\.limit\(1\)/);
});
