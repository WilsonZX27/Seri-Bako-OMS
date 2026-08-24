const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const sql = fs.readFileSync(path.resolve(__dirname, "..", "supabase", "migrations", "200_cleanup_manifested_production_uat_pr.sql"), "utf8");

test("manifested Production UAT cleanup is exact, guarded, audited, and idempotent", () => {
  assert.match(sql, /1e6ab4b0-9238-4735-b928-6054435335e0/);
  assert.match(sql, /PR\/AUG26\/020/);
  assert.match(sql, /PRODUCTION-UAT/);
  assert.match(sql, /deleted_at is null/);
  assert.match(sql, /role_code = 'super_admin'/);
  assert.match(sql, /hard_delete_phase_one\('purchase_request', target_id, target_no\)/);
  assert.match(sql, /if target\.id is null then\s+return;/);
  assert.doesNotMatch(sql, /delete from public\.purchase_requests/i);
});
