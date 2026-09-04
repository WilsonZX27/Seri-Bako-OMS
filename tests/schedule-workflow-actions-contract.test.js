const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync("src/components/attendance/schedule-planner.tsx", "utf8");
const page = fs.readFileSync("src/app/(app)/attendance/schedule/page.tsx", "utf8");
const query = fs.readFileSync("src/server/queries/attendance.ts", "utf8");

test("schedule editor and draft actions only exist in editable workflow states", () => {
  assert.match(source, /\["draft","returned","rejected","amendment_pending"\]\.includes\(week\.status\)/);
  assert.match(source, /editableStatus&&canDraft/);
  assert.match(source, /disabled=\{!editableStatus\|\|!canDraft\}/);
});

test("schedule offers a separate cross-outlet weekly overview without replacing the planner", () => {
  assert.match(page, /view=overview/);
  assert.match(page, /All outlets · weekly overview/);
  assert.match(page, /StatusBadge status=\{outlet\.status\}/);
  assert.match(page, /assignedPeople/);
  assert.match(page, /assignedDays/);
  assert.match(page, /<SchedulePlanner/);
  assert.match(query, /export async function getScheduleOverview/);
  assert.match(query, /schedule_weeks/);
  assert.match(query, /shift_assignment_revisions/);
});

test("submitted schedules expose one primary Manager decision and readable failures", () => {
  assert.match(source, /week\?\.status==="submitted"/);
  assert.match(source, /Approve & publish[\s\S]*Return to Supervisor/);
  assert.match(source, /readJsonResponse/);
  assert.match(source, /actionFeedback/);
  assert.match(source, /disabled=\{busy\}/);
});
