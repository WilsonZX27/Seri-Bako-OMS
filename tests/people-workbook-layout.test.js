import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/lib/attendance/people-workbook.ts", import.meta.url), "utf8");

test("People workbook contains the monthly OT template sections", () => {
  for (const label of ["Working Time", "INFO AS PER PUNCH CARD", "Total Working", "OVERTIME", "Short Hours", "PPH(Triple Pay)", "Total Hours convert to Minutes"]) {
    assert.match(source, new RegExp(label.replace(/[()]/g, "\\$&")));
  }
  assert.match(source, /daysInMonth/);
  assert.match(source, /monthDates/);
  assert.doesNotMatch(source, /Basic Salary|Grand Total|Passport No|salaryNumber/);
});
