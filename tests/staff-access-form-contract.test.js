const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/components/staff-access-fields.tsx", "utf8");

test("staff access form submits the default branch as an accessible branch", () => {
  assert.match(source, /isDefault \? <input type="hidden" name="accessible_branch_ids" value=\{branch\.id\} \/> : null/);
  assert.match(source, /name=\{isDefault \? undefined : "accessible_branch_ids"\}/);
  assert.match(source, /disabled=\{isDefault\}/);
});

test("staff branch shortcuts retain practical touch targets", () => {
  assert.equal((source.match(/inline-flex min-h-9 items-center px-2/g) ?? []).length, 2);
});
