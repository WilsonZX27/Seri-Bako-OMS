import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/lib/attendance/people-workbook.ts", import.meta.url), "utf8");

test("People workbook contains the attendance-only sections and typed duration formats", () => {
  for (const label of ["WORKING TIME", "INFO AS PER FINGERPRINT PUNCH", "Total Working", "Approved OT", "Short Hours", "Outstanding", "Total Hours convert to Minutes", "Prepared By", "Checked By", "Verified By", "Approved By"]) {
    assert.match(source, new RegExp(label.replace(/[()]/g, "\\$&")));
  }
  assert.match(source, /sheetDates/);
  assert.match(source, /formatCode="\[h\]:mm"/);
  assert.doesNotMatch(source, /Basic Salary|Grand Total|Passport No|salaryNumber/);
});
