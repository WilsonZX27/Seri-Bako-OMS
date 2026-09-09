const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");

function loadCalculation() {
  const file = "src/lib/attendance/calculation.ts";
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = new Module(file, module);
  mod.filename = file;
  mod.paths = module.paths;
  mod._compile(compiled, file);
  return mod.exports;
}

const { calculateAttendance, pairPunches } = loadCalculation();
const date = (value) => new Date(`2026-09-01T${value}+08:00`);
const event = (value, source = "OUTLET-A") => ({ occurredAt: date(value), source });
const standard = { scheduledStart: date("09:00:00"), scheduledEnd: date("18:30:00"), maximumRecognisedSeconds: 30600, requiresBreak: true, expectedBranchSource: "OUTLET-A" };

test("01 preserves an exact one-second late duration",()=>assert.equal(calculateAttendance(standard,[event("09:00:01"),event("13:00:00"),event("14:00:00"),event("18:30:00")]).lateSeconds,1));
test("02 applies grace in seconds without rounding",()=>assert.equal(calculateAttendance({...standard,graceSeconds:30},[event("09:00:31"),event("13:00:00"),event("14:00:00"),event("18:30:00")]).lateSeconds,1));
test("03 keeps early arrival visible and unpaid",()=>{const result=calculateAttendance(standard,[event("08:59:59"),event("13:00:00"),event("14:00:00"),event("18:30:00")]);assert.equal(result.preShiftSeconds,1);assert.equal(result.recognisedPaidSeconds,30600)});
test("04 keeps post-shift time visible and unpaid",()=>{const result=calculateAttendance(standard,[event("09:00:00"),event("13:00:00"),event("14:00:00"),event("18:30:01")]);assert.equal(result.postShiftSeconds,1);assert.equal(result.recognisedPaidSeconds,30600)});
test("05 calculates exact early departure",()=>assert.equal(calculateAttendance(standard,[event("09:00:00"),event("13:00:00"),event("14:00:00"),event("18:29:59")]).earlyLeaveSeconds,1));
test("06 pairs one work interval",()=>assert.equal(pairPunches([event("09:00:00"),event("18:30:00")]).intervals.length,1));
test("07 pairs two work intervals",()=>assert.equal(pairPunches([event("09:00:00"),event("13:00:00"),event("14:00:00"),event("18:30:00")]).intervals.length,2));
test("08 pairs three work intervals",()=>assert.equal(pairPunches([event("09:00:00"),event("11:00:00"),event("11:15:00"),event("13:00:00"),event("14:00:00"),event("18:30:00")]).intervals.length,3));
test("09 reports an odd punch without fabricating an OUT",()=>{const result=pairPunches([event("09:00:00"),event("13:00:00"),event("14:00:00")]);assert.equal(result.intervals.length,1);assert.ok(result.exceptions.includes("Odd Punch Count"))});
test("10 reports a required missing break",()=>assert.ok(calculateAttendance(standard,[event("09:00:00"),event("18:30:00")]).exceptions.includes("Missing Break Punch")));
test("11 enforces the 510-minute full-time cap",()=>assert.equal(calculateAttendance({...standard,requiresBreak:false},[event("08:00:00"),event("20:00:00")]).recognisedPaidSeconds,510*60));
test("12 keeps extra part-time time as ordinary payable hours",()=>assert.equal(calculateAttendance({...standard,employmentType:"part_time",requiresBreak:false,maximumRecognisedSeconds:4*3600},[event("09:00:00"),event("18:30:00")]).recognisedPaidSeconds,9.5*3600));
test("13 gives a complete cross-day full-time shift the fixed 8.5 hours",()=>assert.equal(calculateAttendance({scheduledStart:new Date("2026-09-01T22:00:00+08:00"),scheduledEnd:new Date("2026-09-02T06:00:00+08:00"),maximumRecognisedSeconds:28800},[{occurredAt:new Date("2026-09-01T22:00:00+08:00")},{occurredAt:new Date("2026-09-02T06:00:00+08:00")}]).recognisedPaidSeconds,30600));
test("14 reports a device mismatch",()=>assert.ok(calculateAttendance(standard,[event("09:00:00","OTHER"),event("18:30:00","OTHER")]).exceptions.includes("Wrong Branch/Device")));
test("15 rejects impossible explicit OUT then IN ordering",()=>assert.equal(pairPunches([{...event("09:00:00"),type:"out"},{...event("18:30:00"),type:"in"}]).intervals.length,0));
test("16 does not fabricate missing punches",()=>{const result=calculateAttendance(standard,[]);assert.equal(result.actualFirstIn,null);assert.equal(result.intervals.length,0)});
test("17 subtracts multiple actual OUT to IN gaps",()=>assert.equal(calculateAttendance(standard,[event("09:00:00"),event("11:00:00"),event("11:15:00"),event("13:00:00"),event("14:00:00"),event("18:30:00")]).breakSeconds,4500));
test("18 recalculation input remains deterministic",()=>{const punches=[event("09:05:59"),event("13:00:00"),event("14:00:00"),event("18:30:00")];assert.deepEqual(calculateAttendance(standard,punches),calculateAttendance(standard,[...punches].reverse()))});

test("required attendance examples remain exact to the second", () => {
  const early = calculateAttendance(standard, [event("08:50:00"), event("13:00:00"), event("14:00:00"), event("18:30:00")]);
  assert.equal(early.recognisedPaidSeconds, 30600);
  assert.equal(early.lateSeconds, 0);
  const veryEarly = calculateAttendance(standard, [event("08:30:00"), event("13:00:00"), event("14:00:00"), event("18:45:00")]);
  assert.equal(veryEarly.recognisedPaidSeconds, 30600);
  assert.equal(veryEarly.postShiftSeconds, 900);
  const late = calculateAttendance(standard, [event("09:05:00"), event("13:00:00"), event("14:00:00"), event("18:30:00")]);
  assert.equal(late.lateSeconds, 300);
  assert.equal(late.recognisedPaidSeconds, 30600);
  const lateWithSeconds = calculateAttendance(standard, [event("09:05:59"), event("13:00:00"), event("14:00:00"), event("18:30:00")]);
  assert.equal(lateWithSeconds.lateSeconds, 359);
  const earlyLeave = calculateAttendance(standard, [event("09:00:00"), event("13:00:00"), event("14:00:00"), event("18:00:00")]);
  assert.equal(earlyLeave.earlyLeaveSeconds, 1800);
  assert.equal(earlyLeave.recognisedPaidSeconds, 30600);
});

test("four and six punches pair work intervals and actual gaps are unpaid", () => {
  const four = calculateAttendance(standard, [event("09:00:00"), event("13:00:00"), event("14:00:00"), event("18:30:00")]);
  assert.equal(four.intervals.length, 2);
  assert.equal(four.breakSeconds, 3600);
  const six = calculateAttendance(standard, [event("09:00:00"), event("11:00:00"), event("11:15:00"), event("13:00:00"), event("14:00:00"), event("18:30:00")]);
  assert.equal(six.intervals.length, 3);
  assert.equal(six.breakSeconds, 4500);
});

test("odd and missing-break punches create exceptions without invented events", () => {
  assert.ok(pairPunches([event("09:00:00"), event("13:00:00"), event("14:00:00")]).exceptions.includes("Odd Punch Count"));
  assert.ok(calculateAttendance(standard, [event("09:00:00"), event("18:30:00")]).exceptions.includes("Missing Break Punch"));
});

test("full-time is fixed while part-time extra time remains ordinary", () => {
  const events = [event("08:00:00"), event("19:00:00")];
  assert.equal(calculateAttendance({ ...standard, requiresBreak: false }, events).recognisedPaidSeconds, 30600);
  assert.equal(calculateAttendance({ ...standard, employmentType: "part_time", requiresBreak: false, maximumRecognisedSeconds: 14400 }, events).recognisedPaidSeconds, 39600);
});

test("cross-day shifts, unscheduled states and wrong devices are explicit", () => {
  const crossDay = calculateAttendance({ scheduledStart: new Date("2026-09-01T22:00:00+08:00"), scheduledEnd: new Date("2026-09-02T06:00:00+08:00"), maximumRecognisedSeconds: 28800 }, [{ occurredAt: new Date("2026-09-01T21:55:00+08:00") }, { occurredAt: new Date("2026-09-02T06:05:00+08:00") }]);
  assert.equal(crossDay.recognisedPaidSeconds, 30600);
  assert.ok(calculateAttendance(standard, [event("09:00:00", "WRONG"), event("18:30:00", "WRONG")]).exceptions.includes("Wrong Branch/Device"));
  assert.equal(calculateAttendance(standard, []).actualFirstIn, null);
});

test("part-time floors the daily worked total after unpaid breaks",()=>{
 const fourTwentyTwo=calculateAttendance({...standard,employmentType:"part_time",maximumRecognisedSeconds:8*3600},[event("09:00:00"),event("13:22:00")]);
 const fourFiftyNine=calculateAttendance({...standard,employmentType:"part_time",maximumRecognisedSeconds:8*3600},[event("09:00:00"),event("13:59:00")]);
 assert.equal(fourTwentyTwo.payableSeconds,4*3600);assert.equal(fourFiftyNine.payableSeconds,4.5*3600);
});

test("full-time full-day is automatic and requires two one-hour breaks",()=>{
 const shift={...standard,scheduledEnd:date("19:00:01"),maximumRecognisedSeconds:34200};
 const result=calculateAttendance(shift,[event("09:00:00"),event("11:00:00"),event("12:00:00"),event("15:00:00"),event("16:00:00"),event("19:00:01")]);
 assert.equal(result.shiftClass,"full_day");assert.equal(result.payableSeconds,34200);assert.equal(result.paidBreakSeconds,7200);assert.ok(!result.exceptions.includes("Short Break"));
});

test("holiday output returns equivalent hours only when HR configured multipliers",()=>{
 const result=calculateAttendance({...standard,holidayNormalMultiplier:2,holidayOtMultiplier:3},[event("09:00:00"),event("13:00:00"),event("14:00:00"),event("18:30:00")]);
 assert.equal(result.holidayNormalEquivalentSeconds,61200);assert.equal(result.holidayOtEquivalentSeconds,0);
});

test("part-time punch expectation changes only above five scheduled hours",()=>{
 const five=calculateAttendance({scheduledStart:date("09:00:00"),scheduledEnd:date("14:00:00"),maximumRecognisedSeconds:18000,employmentType:"part_time"},[event("09:00:00"),event("14:00:00")]);
 const overFive=calculateAttendance({scheduledStart:date("09:00:00"),scheduledEnd:date("14:00:01"),maximumRecognisedSeconds:18001,employmentType:"part_time"},[event("09:00:00"),event("14:00:01")]);
 assert.equal(five.expectedPunchCount,2);assert.equal(five.missingPunchCount,0);assert.ok(!five.exceptions.includes("Missing Break Punch"));
 assert.equal(overFive.expectedPunchCount,4);assert.equal(overFive.missingPunchCount,2);assert.ok(overFive.exceptions.includes("Missing Break Punch"));
});

test("full-time OT counts only paired work after the original shift end and floors daily",()=>{
 const result=calculateAttendance(standard,[event("09:00:00"),event("13:00:00"),event("14:00:00"),event("18:59:59")]);
 const halfHour=calculateAttendance(standard,[event("09:00:00"),event("13:00:00"),event("14:00:00"),event("19:00:00")]);
 assert.equal(result.overtimeCandidateSeconds,0);assert.equal(halfHour.overtimeCandidateSeconds,1800);
});

test("part-time extra time never becomes RO overtime",()=>{
 const result=calculateAttendance({...standard,employmentType:"part_time",maximumRecognisedSeconds:30600},[event("09:00:00"),event("13:00:00"),event("13:30:00"),event("20:30:00")]);
 assert.equal(result.overtimeCandidateSeconds,0);
});

test("attendance engine encodes exact-second, pairing, cap and exception contracts", () => {
  const source = fs.readFileSync("src/lib/attendance/calculation.ts", "utf8");
  for (const contract of ["Math.max(interval.start", "Math.min(interval.end", "maximumRecognisedSeconds", "Odd Punch Count", "Missing Break Punch", "Wrong Branch/Device", "Unapproved Pre-shift Time", "Unapproved Post-shift Time", "secondsBetween"]) assert.match(source, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("NGTeco profiles are explicit and Attendance Report is reconciliation-only", () => {
  const source = fs.readFileSync("src/lib/attendance/ngteco.ts", "utf8");
  for (const header of ["Person ID", "Punch Date", "Attendance record", "TimeZone", "Source", "Total Late Time", "Total Work Hours(h)"]) assert.ok(source.includes(header));
  assert.ok(source.includes("Reconciliation only"));
  assert.ok(source.includes("MM/DD/YYYY"));
  assert.ok(source.includes("HH:mm:ss"));
});

test("migrations enforce Monday weeks, immutable source and role boundaries", () => {
  const scheduling = fs.readFileSync("supabase/migrations/241_dynamic_scheduling.sql", "utf8");
  const attendance = fs.readFileSync("supabase/migrations/242_ngteco_attendance.sql", "utf8");
  assert.ok(scheduling.includes("extract(isodow from week_start)=1"));
  assert.ok(scheduling.includes("cannot approve their own roster"));
  assert.ok(scheduling.includes("outlet_supervisor"));
  assert.ok(attendance.includes("unique(company_id,event_fingerprint)"));
  assert.ok(attendance.includes("people_operations"));
  assert.ok(!attendance.includes("schedule.approve','attendance"));
  for(const contract of ["recalculate_attendance_week","adjust_attendance_result","attendance_period_locks","upsert_ngteco_person_mapping","upsert_ngteco_device_mapping"]) assert.ok(attendance.includes(contract));
  for(const contract of ["save_schedule_week","copy_schedule_week","review_shift_change_request","cannot approve their own roster","Cross-branch schedule collision"]) assert.ok(scheduling.includes(contract));
});
