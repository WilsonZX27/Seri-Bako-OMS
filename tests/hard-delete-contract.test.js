const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("hard-delete contract stays owner-gated and allowlisted", () => {
  const sql = read("supabase/migrations/056_sprint_7_7_phase_one_hard_delete.sql");
  assert.match(sql, /security definer set search_path = public/);
  assert.match(sql, /r\.role_code='super_admin'/);
  assert.match(sql, /record_type='purchase_request'/);
  assert.match(sql, /record_type='supplier'/);
  assert.match(sql, /record_type='item'/);
  assert.match(sql, /record_type='product'/);
  assert.match(sql, /record_type='recipe'/);
  assert.match(sql, /if company is distinct from actor\.company_id/);
  assert.match(sql, /permanent_deletion_tombstones/);
});

test("bulk PR action reuses preview and delete RPCs", () => {
  const action = read("src/server/actions/hard-delete-bulk.ts");
  assert.match(action, /preview_phase_one_hard_delete/);
  assert.match(action, /hard_delete_phase_one/);
  assert.match(action, /bulk_blocked/);
  assert.match(action, /bulk_failed/);
  assert.match(action, /confirmation.*DELETE/);
});

test("migration 057 makes only intrinsic PR creation history cascade-safe", () => {
  const sql = read("supabase/migrations/057_fix_pr_hard_delete_initial_history.sql");
  assert.match(sql, /Initial document created\./);
  assert.match(sql, /Purchase request '\|\|number\|\|' created/);
  assert.match(sql, /document_comments/);
  assert.match(sql, /attachments/);
  assert.match(sql, /greatest\(c-intrinsic_revision,0\)/);
  assert.match(sql, /greatest\(c-intrinsic_activity,0\)/);
  assert.match(sql, /delete from public\.documents/);
  assert.match(sql, /create or replace function public\.preview_phase_one_hard_delete/);
  assert.match(sql, /create or replace function public\.hard_delete_phase_one/);
  assert.match(sql, /purchase_orders/);
});

test("cancelled PRs have an explicit cancelled display label", () => {
  const status = read("src/lib/purchase-request-status.ts");
  assert.match(status, /status === "cancelled"\) return "Cancelled"/);
});
