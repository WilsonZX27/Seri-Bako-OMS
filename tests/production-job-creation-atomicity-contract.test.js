const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migration = fs.readFileSync("supabase/migrations/096_production_job_creation_atomicity.sql", "utf8");
const actions = fs.readFileSync("src/server/actions/production-jobs.ts", "utf8");
const form = fs.readFileSync("src/components/production-job-form.tsx", "utf8");

test("production-job draft creation is a retry-safe database aggregate", () => {
  assert.match(migration, /create or replace function public\.create_production_job_atomic\(p_payload jsonb\)/);
  assert.match(migration, /has_permission\('production\.create'\)/);
  assert.match(migration, /can_access_inventory_branch\(actor\.company_id, branch_id\)/);
  assert.match(migration, /for update of r/);
  assert.match(migration, /insert into public\.documents/);
  assert.match(migration, /insert into public\.production_jobs/);
  assert.match(migration, /insert into public\.production_job_ingredient_lines/);
  assert.match(migration, /insert into public\.production_job_output_lines/);
  assert.match(migration, /insert into public\.document_revisions/);
  assert.match(migration, /insert into public\.activity_logs/);
  assert.match(migration, /idempotency_key/);
  assert.match(migration, /grant execute on function public\.create_production_job_atomic\(jsonb\) to authenticated/);
  assert.match(actions, /rpc\("create_production_job_atomic"/);
  assert.doesNotMatch(actions, /function createProductionDocument/);
  assert.doesNotMatch(actions, /function ensureOutputItem/);
  assert.match(form, /name="idempotency_key"/);
});
