const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const review = fs.readFileSync("src/app/(app)/attendance/review/page.tsx", "utf8");
const actuals = fs.readFileSync("src/components/attendance/actual-attendance-panel.tsx", "utf8");
const importer = fs.readFileSync("src/components/attendance/attendance-import-workflow.tsx", "utf8");

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
  assert.match(review, /OT \{candidate >= 1800 \? `\$\{Math\.floor\(candidate \/ 1800\)\} × 00:30`/);
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
