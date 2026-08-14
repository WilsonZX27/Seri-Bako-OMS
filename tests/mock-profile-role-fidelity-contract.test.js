const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const mock = fs.readFileSync("src/lib/mock-mode.ts", "utf8");
const common = fs.readFileSync("src/server/queries/common.ts", "utf8");
const layout = fs.readFileSync("src/app/(app)/layout.tsx", "utf8");

test("supported mock mode exposes one coherent Owner staff-role state", () => {
  assert.match(mock, /role: "super_admin" as const/);
  assert.match(mock, /role_code: "super_admin" as const/);
  assert.match(mock, /has_staff_role: true/);
  assert.match(common, /if \(isMockMode\(\)\) \{\s*return mockProfile;/);
  assert.match(layout, /const hasStaffRole = .*has_staff_role/);
  assert.match(layout, /!hasStaffRole/);
});
