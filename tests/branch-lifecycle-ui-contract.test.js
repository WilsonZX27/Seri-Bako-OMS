const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const form = fs.readFileSync("src/components/foundation-forms.tsx", "utf8");
const start = form.indexOf("export function BranchForm");
const end = form.indexOf("export function StaffForm");
const branchForm = form.slice(start, end);

test("branch lifecycle status is preserved but not directly editable in the record form", () => {
  assert.match(branchForm, /type="hidden" name="status" value=\{branch\?\.status \?\? "active"\}/);
  assert.doesNotMatch(branchForm, /<Field label="Status">/);
  assert.doesNotMatch(branchForm, /<StatusSelect/);
  assert.match(branchForm, /Lifecycle changes stay in the action panel/);
});
