const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync("src/components/attendance/schedule-planner.tsx", "utf8");

test("schedule editor and draft actions only exist in editable workflow states", () => {
  assert.match(source, /\["draft","returned","rejected","amendment_pending"\]\.includes\(week\.status\)/);
  assert.match(source, /editableStatus&&canDraft/);
  assert.match(source, /disabled=\{!editableStatus\|\|!canDraft\}/);
});

test("submitted schedules expose one primary Manager decision and readable failures", () => {
  assert.match(source, /week\?\.status==="submitted"/);
  assert.match(source, /Approve & publish[\s\S]*Return to Supervisor/);
  assert.match(source, /readJsonResponse/);
  assert.match(source, /actionFeedback/);
  assert.match(source, /disabled=\{busy\}/);
});
