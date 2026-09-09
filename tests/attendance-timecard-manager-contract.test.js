const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");

const migration = fs.readFileSync("supabase/migrations/268_manager_scheduling_and_timecard_import.sql", "utf8");
const workflow = fs.readFileSync("src/components/attendance/attendance-import-workflow.tsx", "utf8");
const mappings = fs.readFileSync("src/components/attendance/mapping-admin.tsx", "utf8");
const schedule = fs.readFileSync("src/components/attendance/schedule-planner.tsx", "utf8");
const permissions = fs.readFileSync("src/server/auth/permissions.ts", "utf8");

test("Timecard is detected only so the UI can reject it as derived evidence", () => {
  const moduleUrl = pathToFileURL(path.resolve("src/lib/attendance/ngteco.ts")).href;
  const script = `import(${JSON.stringify(moduleUrl)}).then(m=>console.log(JSON.stringify({profile:m.detectParserProfile(['Person ID','Person Name','Date','Clock In','Clock Out']),week:m.inferTimecardWeek([{'Date':'09/05/2026'},{'Date':'09/06/2026'}]),rows:m.parseTimecardRows([{'Person ID':'10','Person Name':'Employee','Date':'09/05/2026','Clock In':'07:18:27','Clock Out':'20:16:25'},{'Person ID':'11','Person Name':'Employee 2','Date':'09/06/2026','Clock In':'','Clock Out':''}])})))`;
  const result = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], { encoding: "utf8" }));
  assert.equal(result.profile, "timecard_report");
  assert.equal(result.week, "2026-08-31");
  assert.deepEqual(result.rows[0].errors, []);
  assert.match(result.rows[1].warnings.join(" "), /skipped/);
});

test("Actual Attendance accepts only immutable multi-week raw punches", () => {
  const repair=fs.readFileSync("supabase/migrations/273_schedule_validation_and_raw_punch_files.sql","utf8");
  const route=fs.readFileSync("src/app/api/attendance/imports/confirm/route.ts","utf8");
  assert.match(repair,/finalise_attendance_punch_file/);
  assert.match(repair,/excluded_from_calculation/);
  assert.match(repair,/date_trunc\('week'/);
  assert.match(route,/z\.literal\("view_attendance_punch"\)/);
  assert.doesNotMatch(route,/timecardPunches/);
  assert.match(workflow,/This file is not raw punch evidence/);
  assert.match(workflow,/Multi-week files are split automatically/);
});

test("Manager can own an audited roster while Supervisor self approval remains blocked", () => {
  assert.match(migration, /'schedule\.draft','schedule\.submit'/);
  assert.match(migration, /r\.role_code='manager'/);
  assert.match(migration, /p_decision='approve' and manager_self_publish/);
  assert.match(migration, /schedule_approval_events/);
  assert.match(permissions, /manager:[^\n]+"schedule\.draft"[^\n]+"schedule\.submit"[^\n]+"schedule\.approve"/);
});

test("Attendance mapping and quick assignments use the compact location vocabulary", () => {
  assert.match(migration, /branch_type in \('outlet','central_kitchen'\)/);
  assert.match(mappings, /Source<\/span><span>Assigned location<\/span><span>Actions/);
  assert.match(mappings, />Change<\/Button>/);
  for (const tone of ["slate", "blue", "violet", "amber", "teal"]) assert.match(schedule, new RegExp(`border-${tone}-200`));
});

test("invalid raw punch rows do not block valid rows", () => {
  assert.match(workflow, /const importableRows/);
  assert.match(workflow, /rows:importableRows\.map/);
  assert.match(workflow, /invalid rows will be excluded/);
  assert.doesNotMatch(workflow, /errors>0\|\|saving/);
});
