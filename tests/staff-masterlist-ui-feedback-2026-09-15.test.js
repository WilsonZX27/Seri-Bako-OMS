const fs = require("node:fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const read = (file) => fs.readFileSync(file, "utf8");

test("staff activity uses the authentication provider's latest successful sign-in", () => {
  const auth = read("src/server/auth/admin-users.ts");
  const query = read("src/server/queries/foundation.ts");
  const page = read("src/app/(app)/staffs/[id]/page.tsx");

  assert.match(auth, /lastSignInAt: user\.last_sign_in_at \?\? null/);
  assert.match(auth, /admin\.auth\.admin\.getUserById\(id\)/);
  assert.match(query, /await getAuthUserSummary\(staff\.auth_user_id\)/);
  assert.match(query, /auth_last_sign_in_at: authUser\?\.lastSignInAt \?\? null/);
  assert.match(page, /Last successful sign-in/);
  assert.match(page, /staff\.auth_last_sign_in_at/);
  assert.doesNotMatch(page, /staff\.last_login_at/);
});

test("staff permission and account panels use the shared Apple-style panel radius", () => {
  const page = read("src/app/(app)/staffs/[id]/page.tsx");
  const permissions = read("src/components/staff-permission-overrides.tsx");

  assert.doesNotMatch(page, /rounded-\[2px\]/);
  assert.match(page, /rounded-\[var\(--sb-radius-panel\)\]/);
  assert.match(permissions, /overflow-hidden rounded-\[var\(--sb-radius-panel\)\]/);
  assert.match(permissions, /rounded-\[var\(--sb-radius-control\)\] border border-\[var\(--sb-warning\)\]/);
});
