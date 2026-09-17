const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("new Staff creation does not reuse profiles or leave a usable partial account", () => {
  const source = read("src/server/actions/foundation.ts");
  assert.match(source, /already uses this email[\s\S]*instead of creating a duplicate/);
  assert.match(source, /if \(matches\.length === 1\) throw new Error\("An Auth account already exists[\s\S]*Repair sign-in link/);
  assert.match(source, /if \(updateError\) \{[\s\S]*deleteUser\(authUserId\)[\s\S]*throw new Error\(updateError\.message\)/);
  assert.match(source, /if \(createdStaffId && !isMockMode\(\)\)[\s\S]*from\("staffs"\)\.delete\(\)[\s\S]*deleteUser/);
});

test("first password changes require an existing exact Staff/Auth link before Auth mutation", () => {
  const actions = read("src/server/actions/auth.ts");
  const session = read("src/server/auth/staff-session.ts");
  const callback = read("src/app/auth/callback/route.ts");
  assert.equal(actions.includes("syncCurrentAuthUserToStaff"), false);
  assert.equal(session.includes("syncAuthUserToStaff"), false);
  assert.equal(callback.includes("syncCurrentAuthUserToStaff"), false);
  assert.match(session, /eq\("auth_user_id", userId\)[\s\S]*staff profile email does not match this sign-in account/);
  const updateCalls = [...actions.matchAll(/supabase\.auth\.updateUser\(\{ password \}\)/g)].map((match) => match.index);
  const preflights = [...actions.matchAll(/requireLinkedStaffForAuthUser\(user\.id, user\.email \?\? null\)/g)].map((match) => match.index);
  assert.equal(updateCalls.length, 2);
  assert.equal(preflights.length, 2);
  assert.ok(preflights[0] < updateCalls[0] && preflights[1] < updateCalls[1]);
});

test("invited linked Staff is visible only for onboarding while operational permissions remain active-only", () => {
  const repair = read("supabase/migrations/076_staff_auth_link_repair.sql");
  const permissions = read("supabase/migrations/052_sprint_7_5_staff_permission_overrides.sql");
  const resolver = read("src/server/auth/route-resolver.ts");
  assert.match(repair, /auth_user_id = auth\.uid\(\) and status in \('active', 'invited'\)/);
  assert.match(repair, /or \(company_id = public\.current_staff_company_id\(\) and public\.has_permission\('staffs\.read'\)\)/);
  assert.match(permissions, /s\.status = 'active'/);
  assert.match(resolver, /if \(state\.mustChangePassword\)[\s\S]*"\/change-password"/);
  assert.match(resolver, /if \(state\.staffStatus === "invited"\)[\s\S]*"\/set-password"/);
});

test("repair transaction is exact-match, Owner-only, atomic, and audited", () => {
  const sql = read("supabase/migrations/076_staff_auth_link_repair.sql");
  assert.match(sql, /not public\.current_staff_is_owner\(\)/);
  assert.match(sql, /matched_staff_count <> 1/);
  assert.match(sql, /matched_auth_count <> 1/);
  assert.match(sql, /lower\(trim\(coalesce\(u\.email/);
  assert.match(sql, /Auth account is already linked to another staff profile/);
  assert.match(sql, /update public\.staffs set auth_user_id/);
  assert.match(sql, /'auth_link_repaired'/);
  assert.match(sql, /revoke all on function public\.repair_staff_auth_link/);
});

test("Staff UI exposes explicit states and only Owners receive the repair control", () => {
  const state = read("src/lib/staff-auth-state.ts");
  const detail = read("src/app/(app)/staffs/[id]/page.tsx");
  const list = read("src/app/(app)/people/page.tsx");
  const compatibility = read("src/app/(app)/staffs/page.tsx");
  assert.match(state, /"Auth linked"/);
  assert.match(state, /"Setup pending"/);
  assert.match(state, /"Link needs repair"/);
  assert.match(detail, /isOwner && authState === "link_needs_repair"/);
  assert.match(detail, />\s*Repair sign-in link\s*</);
  assert.match(list, /staffAuthStateLabels\[getStaffAuthState\(staff\)\]/);
  assert.match(compatibility, /redirect\(query\.size \? `\/people\?/);
  assert.doesNotMatch(detail, /target_auth_user_id|auth_user_id\}/);
});

test("unlinked Auth users remain outside operational workspaces", () => {
  const middleware = read("src/lib/supabase/middleware.ts");
  const resolver = read("src/server/auth/route-resolver.ts");
  assert.match(middleware, /const authUserId = claimsData\?\.claims\?\.sub/);
  assert.match(middleware, /eq\("auth_user_id", authUserId\)/);
  assert.match(resolver, /missing-profile/);
});

test("v7.23.7.2 release blockers keep onboarding input singular and collapse permission fan-out", () => {
  const newStaff = read("src/app/(app)/staffs/new/page.tsx");
  const forms = read("src/components/foundation-forms.tsx");
  const auth = read("src/server/actions/auth.ts");
  const permissionSource = read("src/server/auth/permissions.ts");
  const migration = read("supabase/migrations/076_staff_auth_link_repair.sql");
  assert.doesNotMatch(newStaff, /StaffAuthSetupFields/);
  assert.match(newStaff, /includeAuthSetup/);
  assert.match(forms, /includeAuthSetup[\s\S]*<StaffAuthSetupFields/);
  assert.match(auth, /changePassword[\s\S]*redirect\("\/dashboard"\)/);
  assert.match(migration, /p\.permission_code = 'documents\.comment'[\s\S]*r\.role_code = 'manager'/);
  assert.match(permissionSource, /manager:[^\n]*"documents\.comment"/);
  assert.match(migration, /get_allowed_permissions\(permission_codes text\[\]\)/);
  assert.match(permissionSource, /rpc\("get_allowed_permissions"/);
  assert.doesNotMatch(permissionSource, /Promise\.all\(permissions\.map/);
});
