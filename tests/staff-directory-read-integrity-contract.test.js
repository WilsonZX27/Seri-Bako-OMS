const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/server/queries/foundation.ts"), "utf8");

test("staff directory fails closed when identity relationships cannot be read", () => {
  const start = source.indexOf("export async function getStaffs(");
  const end = source.indexOf("export async function getStaff(", start);
  assert.ok(start >= 0 && end > start, "getStaffs query must remain independently auditable");
  const getStaffs = source.slice(start, end);

  assert.match(getStaffs, /error: branchesError/);
  assert.match(getStaffs, /error: rolesError/);
  assert.match(getStaffs, /error: staffRolesError/);
  assert.match(getStaffs, /error: staffBranchesError/);
  assert.match(getStaffs, /if \(branchesError\) throw new Error/);
  assert.match(getStaffs, /if \(rolesError\) throw new Error/);
  assert.match(getStaffs, /if \(staffRolesError\) throw new Error/);
  assert.match(getStaffs, /if \(staffBranchesError\) throw new Error/);
});
