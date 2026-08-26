const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const sql = fs.readFileSync(path.resolve(__dirname, "..", "supabase", "migrations", "212_database_lint_error_closure.sql"), "utf8");
test("database lint closure repairs every error-level function identified in the audit", () => {
  for (const name of ["preview_phase_one_hard_delete_v057", "bootstrap_first_admin", "create_production_job_atomic", "create_operational_item", "record_system_incident"]) assert.match(sql, new RegExp(name));
  assert.match(sql, /production_job_ingredient_lines/);
  assert.match(sql, /Keep the first-owner bootstrap deterministic/);
  assert.match(sql, /removing obsolete locations/);
  assert.match(sql, /v_branch_id/);
  assert.match(sql, /Incident notification column repair/);
});
