const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const queries = fs.readFileSync("src/server/queries/attendance.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/311_attendance_current_exception_summary.sql", "utf8");

test("attendance overview preserves its summary and adds a bounded canonical status read", () => {
  const workspace = queries.slice(
    queries.indexOf("export async function getAttendanceWorkspace"),
    queries.indexOf("export async function getSchedulePlanner"),
  );
  assert.match(workspace, /rpc\("get_attendance_workspace_summary"/);
  assert.match(workspace, /\.from\("schedule_weeks"\)/);
  assert.match(workspace, /select\("branch_id,revision,status", \{ count: "exact" \}\)/);
  assert.match(workspace, /\.limit\(1000\)/);
  assert.match(workspace, /summarizeScheduleWeeks/);
  assert.match(migration, /r\.work_date between p_week_start and week_end/);
  assert.match(migration, /r\.is_current/);
  assert.match(migration, /count\(distinct e\.result_id\)/);
});

test("attendance overview requests only the latest import metadata row", () => {
  assert.match(migration, /attendance_import_batches[\s\S]*?order by created_at desc limit 1/);
});
