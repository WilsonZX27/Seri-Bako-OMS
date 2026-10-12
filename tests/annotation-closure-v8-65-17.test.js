const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("AutoCount accepts incremental file batches and closes completed-job retry", () => {
  const workflow = read("src/components/imports/autocount-import-workflow.tsx");
  const confirm = read("src/app/api/imports/autocount/confirm/route.ts");
  const importer = read("src/lib/imports/autocount.ts");
  assert.match(workflow, /mergeSelectedFiles\(files, parsed\)/);
  assert.match(workflow, /file\.type !== "location_snapshot"/);
  assert.match(workflow, /Drop files to add them/);
  assert.match(workflow, /event\.currentTarget\.value = ""/);
  assert.match(workflow, /alreadyCompleted = preview\?\.status === "completed"/);
  assert.match(workflow, /Already imported/);
  assert.match(workflow, /Review after import/);
  assert.doesNotMatch(workflow, /Non-blocking review notes/);
  assert.match(confirm, /job\?\.status === "completed"/);
  assert.match(confirm, /alreadyCompleted: true/);
  assert.match(importer, /\["code", "message", "details", "hint"\]/);
});

test("late PO attachments synchronize into existing Goods Receiving documents", () => {
  const migration = read("supabase/migrations/225_sync_po_attachments_to_existing_receivings.sql");
  assert.match(migration, /sync_purchase_order_attachment_to_receivings/);
  assert.match(migration, /after insert or update of status, deleted_at on public\.attachments/);
  assert.match(migration, /join public\.goods_receivings gr/);
  assert.match(migration, /not exists/);
  assert.match(migration, /revoke all on function public\.sync_purchase_order_attachment_to_receivings\(\)/);
});

test("PR repair dialog is concise and leads with item identity", () => {
  const recovery = read("src/components/purchase-request-line-recovery.tsx");
  const addLine = read("src/components/add-purchase-request-line-dialog.tsx");
  assert.match(recovery, /<h3 className="truncate text-base font-semibold">\{itemName\}<\/h3>/);
  assert.match(recovery, /text-xs text-muted-foreground">\{itemCode\}/);
  assert.doesNotMatch(recovery, /Owner: \{issue\.ownerRole\}/);
  assert.doesNotMatch(recovery, /Selected: \{selectedItem\.item_code\}/);
  assert.doesNotMatch(addLine, /Add one item and keep the reason in revision history/);
});

test("Outlet Daily uses clear table labels, width authority, and shared timeline", () => {
  const list = read("src/app/(app)/outlet-daily-records/page.tsx");
  const detail = read("src/app/(app)/outlet-daily-records/[id]/page.tsx");
  const form = read("src/components/outlet-daily-record-form.tsx");
  const timeline = read("src/components/documents/document-panels.tsx");
  assert.match(list, /Updated<br \/>By/);
  assert.match(list, /label="Last Updated"/);
  assert.doesNotMatch(list, /\? "Confirmed"/);
  assert.match(detail, /<TimelineEventList events=/);
  assert.match(form, /sm:w-64/);
  assert.match(timeline, /relative ml-2 flex gap-3 border-l/);
});

test("backup page truthfully distinguishes records, metadata, and file bodies", () => {
  const page = read("src/app/(app)/administration/backups/backup-page.tsx");
  const exporter = read("src/server/backup/export.ts");
  for (const table of ["purchase_requests", "purchase_orders", "goods_receivings", "outlet_daily_records", "attachments"]) {
    assert.match(exporter, new RegExp(`table: "${table}"`));
  }
  assert.match(page, /attachment metadata/);
  assert.match(page, /not the uploaded file bodies/);
});
