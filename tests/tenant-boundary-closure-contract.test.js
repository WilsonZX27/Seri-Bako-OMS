const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("company backup has an explicit classification manifest and derives scope from the active Owner", () => {
  const backup = read("src/server/backup/export.ts");
  const route = read("src/app/api/backups/system/route.ts");

  for (const classification of ["company_id filtered", "parent-company filtered", "branch/company relation filtered", "intentionally global reference data", "excluded"]) {
    assert.match(backup, new RegExp(`classification: "${classification.replaceAll("/", "\\/")}"`));
  }
  assert.match(backup, /requireActiveTenantActor\(\{ owner: true \}\)/);
  assert.match(backup, /fetchDatasetRows\(db, dataset, access\.actor\.companyId/);
  assert.match(backup, /auth\.users[\s\S]*classification: "excluded"/);
  assert.match(backup, /storage\.objects[\s\S]*classification: "excluded"/);
  assert.doesNotMatch(route, /company_id|companyId/);
});

test("foundation mutations use the authenticated company and replace staff access atomically", () => {
  const foundation = read("src/server/actions/foundation.ts");
  const actor = read("src/server/auth/tenant-actor.ts");

  assert.match(foundation, /requireActiveTenantActor/);
  assert.match(foundation, /rpc\("replace_staff_access_atomic"/);
  assert.match(foundation, /branchPayload\(formData, actor\.companyId\)/);
  assert.match(foundation, /\.eq\("company_id", actor\.companyId\)/);
  assert.doesNotMatch(foundation, /String\(formData\.get\("company_id"\)/);
  assert.match(actor, /row\.status !== "active"/);
});

test("migration 081 owns masters, removes permissive policies, and locks staff access per company", () => {
  const migration = read("supabase/migrations/081_tenant_boundary_closure.sql");

  for (const table of ["items", "products", "suppliers", "supplier_items", "uom_conversions"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table}[\\s\\S]*company_id`));
  }
  assert.match(migration, /replace_staff_access_atomic/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /remaining_owner_count = 0/);
  assert.match(migration, /drop policy if exists "companies read" on public\.companies/);
  assert.match(migration, /revoke all on all tables in schema public from anon/);
});
