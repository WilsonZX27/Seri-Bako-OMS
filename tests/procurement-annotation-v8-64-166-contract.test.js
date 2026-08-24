const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

test("PR and Dashboard operational rows use stable aligned tracks", () => {
  const list = read("src/app/(app)/purchase-requests/page.tsx");
  const dashboard = read("src/components/dashboard-workspace.tsx");
  for (const source of [list, dashboard]) {
    assert.match(source, /data-pr-context-grid/);
    assert.match(source, /data-pr-metrics-grid/);
    assert.match(source, /title=\{(?:supplierLabel|row\.supplier_names\.join)/);
  }
});

test("PR item entry is supplier scoped and selection remains explicit", () => {
  const form = read("src/components/procurement-forms.tsx");
  assert.match(form, /mapping\.branch_id === branchId && mapping\.supplier_id === requestSupplierId && mapping\.item_id === item\.id/);
  assert.match(form, /function updateItemSearch/);
  assert.match(form, /onValueChange=\{\(value\).*updateItemSearch/);
  assert.match(form, /Supplier not set/);
});

test("attachments and rejection feedback use compact consistent presentation", () => {
  const panels = read("src/components/documents/document-panels.tsx");
  const detail = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  assert.match(panels, /submitLabel=\{uploadLabel \?\? "Upload"\}/);
  assert.doesNotMatch(panels, /attachment\.file_type \?\? "File"/);
  assert.match(detail, /MessageSquare/);
  assert.match(detail, /bg-\[var\(--sb-danger-bg\)\]/);
  assert.match(detail, /formatDateTime\(request\.created_at\)/);
});

test("migration 204 guards PO send and permanent deletion", () => {
  const sql = read("supabase/migrations/204_procurement_annotation_closure.sql");
  assert.match(sql, /role_code in \('purchasing','finance'\)/);
  assert.match(sql, /permission_code='purchase_order\.send'/);
  assert.match(sql, /po\.status='cancelled'/);
  assert.match(sql, /grn_count=0 and return_count=0 and invoice_count=0/);
  assert.match(sql, /permanent_deletion_tombstones/);
});
