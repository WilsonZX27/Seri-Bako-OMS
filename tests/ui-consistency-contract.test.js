const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const imports = read("src/components/imports/import-workflow.tsx");
const staffPermissions = read("src/components/staff-permission-overrides.tsx");
const roleMatrix = read("src/components/role-permission-matrix.tsx");
const styles = read("src/app/globals.css");

test("UI consistency keeps imports upload-only and technical permission details collapsed", () => {
  assert.doesNotMatch(imports, /Edit in table|Add blank row|Paste into table/);
  assert.match(imports, /Upload file/);
  assert.match(imports, /Confirm import/);
  assert.match(staffPermissions, /Technical details/);
  assert.match(staffPermissions, /<details key=\{module\}/);
  assert.match(roleMatrix, /<details key=\{module\}/);
});

test("shared filter rows use compact brown submits and reset affordances", () => {
  assert.match(styles, /\.sb-list-filters > button:is\(\[type="submit"\], :not\(\[type\]\)\)/);
  assert.match(styles, /background: var\(--sb-amber-700\)/);
  assert.match(styles, /\.sb-list-filters > a::before/);
});
