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
  assert.match(action, /blocked/);
  assert.match(action, /failed/);
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

test("migration 058 allows only intrinsic cancellation history", () => {
  const sql = read("supabase/migrations/058_allow_cancellation_only_pr_hard_delete.sql");
  assert.match(sql, /preview_phase_one_hard_delete_v057/);
  assert.match(sql, /activity_type='cancelled'/);
  assert.match(sql, /workflow_step.*draft/);
  assert.match(sql, /next_status.*cancelled/);
  assert.match(sql, /invalid_activity = 0/);
  assert.match(sql, /cancelled_count = 1/);
  assert.match(sql, /delete from public\.activity_logs/);
  assert.match(sql, /permanent_deletion_tombstones/);
});

test("bulk review presents eligible and blocked records and keeps results visible", () => {
  const component = read("src/components/bulk-phase-one-delete.tsx");
  assert.match(component, /previewBulkHardDeletePurchaseRequests/);
  assert.match(component, /Eligible/);
  assert.match(component, /Blocked/);
  assert.match(component, /deleted.*blocked.*failed/);
  assert.match(component, /Deletion failed/);
});

test("migration 059 treats PR-owned history as cascade-safe and only downstream documents block", () => {
  const sql = read("supabase/migrations/059_simplify_owner_pr_hard_delete.sql");
  assert.match(sql, /preview_phase_one_hard_delete_v058/);
  assert.match(sql, /eligible', po_count=0/);
  assert.match(sql, /downstream_documents/);
  assert.match(sql, /purchase_request_lines/);
  assert.match(sql, /document_comments/);
  assert.match(sql, /attachments/);
  assert.match(sql, /activity_logs/);
  assert.match(sql, /document_revisions/);
  assert.match(sql, /delete from public\.purchase_request_lines/);
  assert.match(sql, /delete from public\.attachments/);
  assert.match(sql, /permanent_deletion_tombstones/);
  assert.match(sql, /alter function public\.preview_phase_one_hard_delete\(text, uuid\) rename to preview_phase_one_hard_delete_v058/);
});
