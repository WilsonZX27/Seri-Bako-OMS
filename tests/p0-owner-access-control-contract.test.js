const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("bootstrap is operator-token gated and service-role-only", () => {
  const migration = read("supabase/migrations/082_owner_access_control_closure.sql");
  const action = read("src/server/actions/setup.ts");
  const page = read("src/app/setup/page.tsx");

  assert.match(migration, /request\.jwt\.claim\.role.*service_role/);
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\('seri-bako:first-owner-bootstrap'/);
  assert.match(migration, /revoke all on function public\.bootstrap_first_admin\(uuid\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.bootstrap_first_admin\(uuid\) to service_role/);
  assert.match(action, /SUPABASE_BOOTSTRAP_TOKEN/);
  assert.match(action, /timingSafeEqual/);
  assert.match(action, /createAdminClient\(\)/);
  assert.match(page, /name="bootstrap_token"/);
});

test("Owner identity relinking is trigger-protected and RPC-authorized", () => {
  const migration = read("supabase/migrations/082_owner_access_control_closure.sql");
  const foundation = read("src/server/actions/foundation.ts");
  const importer = read("src/app/api/imports/confirm/route.ts");

  assert.match(migration, /create trigger prevent_owner_auth_relink/);
  assert.match(migration, /create trigger prevent_non_owner_owner_assignment/);
  assert.match(migration, /Only an Owner or the authorized first-owner bootstrap can assign the Owner role/);
  assert.match(migration, /coalesce\(current_setting\('seri_bako\.owner_auth_relink', true\), ''\) <> 'authorized'/);
  assert.match(migration, /current_staff_is_owner\(\)/);
  assert.match(migration, /perform set_config\('seri_bako\.owner_auth_relink', 'authorized', true\)/);
  assert.match(migration, /grant execute on function public\.repair_staff_auth_link\(uuid, uuid, text\) to authenticated/);
  assert.match(foundation, /rpc\("repair_staff_auth_link"/);
  assert.match(importer, /Only an existing Super Admin \/ Owner can assign the protected Owner role/);
  assert.match(importer, /context\.profile\?\.role_code !== "super_admin"/);
  assert.doesNotMatch(migration, /grant execute on function public\.bootstrap_first_admin\([^)]*\) to authenticated/);
});
