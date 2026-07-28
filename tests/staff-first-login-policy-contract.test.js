const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("invited staff can read only their own profile before the mandatory password change", () => {
  const migration = read("supabase/migrations/106_invited_staff_self_read.sql");

  assert.match(migration, /drop policy if exists "tenant staffs read" on public\.staffs/);
  assert.match(migration, /auth_user_id = auth\.uid\(\) and status in \('active', 'invited'\) and deleted_at is null/);
  assert.match(migration, /company_id = public\.current_staff_company_id\(\) and public\.has_permission\('staffs\.read'\)/);
});

test("temporary-password sign-in checks the first-password requirement before role routing", () => {
  const auth = read("src/server/actions/auth.ts");
  const staffCheck = auth.indexOf("if (staff?.must_change_password)");
  const roleQuery = auth.indexOf('from("staff_roles")');

  assert.notEqual(staffCheck, -1);
  assert.notEqual(roleQuery, -1);
  assert.ok(staffCheck < roleQuery, "first-password users must reach /change-password before role routing");
});
