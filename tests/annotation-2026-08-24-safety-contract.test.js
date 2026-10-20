import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("PR attachments wrap narrow action rows and retain icon-only file actions", () => {
  const upload = read("src/components/documents/attachment-upload-form.tsx");
  const panels = read("src/components/documents/document-panels.tsx");
  assert.match(upload, /Add Attachment/);
  assert.match(upload, /flex min-w-0 flex-wrap gap-2/);
  assert.match(upload, /labelClassName="sr-only"/);
  assert.doesNotMatch(panels, />Download</);
  assert.match(panels, /<Eye/);
  assert.match(panels, /Revision \{revision\.revision_no\}/);
  assert.doesNotMatch(panels, /A new revision is recorded/);
});

test("destructive actions use a visible confirmation boundary", () => {
  const shared = read("src/components/ui/destructive-action-dialog.tsx");
  const documentAction = read("src/components/document-action-bar.tsx");
  const po = read("src/app/(app)/purchase-orders/[id]/page.tsx");
  assert.match(shared, /ModalShell/);
  assert.match(shared, /variant="destructive"/);
  assert.match(shared, /Keep record/);
  assert.match(documentAction, /variant === "destructive"/);
  assert.match(documentAction, /Confirm destructive action/);
  assert.match(po, /restorePurchaseOrder/);
  assert.match(po, /Restore purchase order/);
});

test("cancelled purchase orders remain visible and recoverable", () => {
  const migration = read("supabase/migrations/202_recoverable_cancelled_purchase_orders.sql");
  const query = read("src/server/queries/procurement.ts");
  assert.match(migration, /cancelled_recoverable/);
  assert.match(migration, /restore_cancelled_purchase_order_atomic/);
  assert.match(migration, /status = 'cancelled'[\s\S]*deleted_at is not null/);
  assert.match(migration, /Another active purchase order already exists/);
  assert.match(migration, /downstream records and cannot be restored/);
  assert.match(migration, /approval_status <> 'cancelled'/);
  assert.match(query, /if \(status !== "cancelled"\) query = query\.is\("deleted_at", null\)/);
});

test("Purchasing review explicitly requires the AutoCount PO number", () => {
  const detail = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  const actions = read("src/server/actions/procurement.ts");
  assert.match(detail, /AutoCount PO Number/);
  assert.match(detail, /Required before Finance Review/);
  assert.match(detail, /Complete Purchasing Review/);
  assert.match(actions, /const autocountPoNo = z\.string\(\)\.trim\(\)\.min\(1/);
});

test("PR and Dashboard mobile rows share a compact three-line operational composition", () => {
  const list = read("src/app/(app)/purchase-requests/page.tsx");
  const dashboard = read("src/components/dashboard-workspace.tsx");
  assert.match(list, /secondary=\{<span className="sb-pr-phone-supplier-row"/);
  assert.match(list, /detail=\{<span className="sb-pr-phone-location-row"/);
  assert.match(dashboard, /row\.branch_name \?\? "Unassigned"/);
  assert.match(dashboard, /row\.line_count\} \{row\.line_count === 1 \? "item" : "items"\}/);
  for (const source of [list, dashboard]) assert.doesNotMatch(source, /data-pr-context-grid|data-pr-metrics-grid/);
});

test("PR line picker is supplier-scoped, item-code ordered, and searchable", () => {
  const detail = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  const dialog = read("src/components/add-purchase-request-line-dialog.tsx");
  const combobox = read("src/components/item-combobox.tsx");
  assert.match(detail, /selectedSupplierIds/);
  assert.match(detail, /localeCompare\(right\.item_code/);
  assert.match(dialog, /<ItemCombobox/);
  assert.match(dialog, /Search item code or name/);
  assert.match(dialog, /name="supplier_id" value=\{suppliers\[0\]\?\.id/);
  assert.match(combobox, /if \(!tokens\.length\) return true/);
});

test("Outlet Daily uses a compact two-line Submitted By header", () => {
  const daily = read("src/app/(app)/outlet-daily-records/page.tsx");
  assert.match(daily, /Updated<br \/>By/);
});
