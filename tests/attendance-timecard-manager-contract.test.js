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

test("Timecard parser detects the supplied export shape and infers its Monday week", () => {
  const moduleUrl = pathToFileURL(path.resolve("src/lib/attendance/ngteco.ts")).href;
  const script = `import(${JSON.stringify(moduleUrl)}).then(m=>console.log(JSON.stringify({profile:m.detectParserProfile(['Person ID','Person Name','Date','Clock In','Clock Out']),week:m.inferTimecardWeek([{'Date':'09/05/2026'},{'Date':'09/06/2026'}]),rows:m.parseTimecardRows([{'Person ID':'10','Person Name':'Employee','Date':'09/05/2026','Clock In':'07:18:27','Clock Out':'20:16:25'},{'Person ID':'11','Person Name':'Employee 2','Date':'09/06/2026','Clock In':'','Clock Out':''}])})))`;
  const result = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], { encoding: "utf8" }));
  assert.equal(result.profile, "timecard_report");
  assert.equal(result.week, "2026-08-31");
  assert.deepEqual(result.rows[0].errors, []);
  assert.match(result.rows[1].warnings.join(" "), /skipped/);
});

test("Timecard import is server-authoritative, idempotent, and preserves one-sided exceptions", () => {
  assert.match(migration, /finalise_timecard_attendance_import/);
  assert.match(migration, /event_fingerprint/);
  assert.match(migration, /on conflict\(company_id,event_fingerprint\) do nothing/);
  assert.match(migration, /missing_check_in/);
  assert.match(migration, /missing_check_out/);
  assert.match(migration, /parser_profile='timecard_report'/);
  assert.match(workflow, /Attendance week/);
  assert.match(workflow, /more than one attendance week/);
  assert.doesNotMatch(workflow, /profile === "timecard_report"[^\n]+unmappedSources/);
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
