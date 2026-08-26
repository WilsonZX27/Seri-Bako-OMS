const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("unposted procurement cancellation is audited and PO cancellation remains recoverable", () => {
  const migration = read("supabase/migrations/120_unposted_procurement_cancel_removes_active_work.sql");
  const approvalRemovalMigration = read("supabase/migrations/125_unposted_purchase_request_removal.sql");
  const actions = read("src/server/actions/procurement.ts");
  const prDetail = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  const poDetail = read("src/app/(app)/purchase-orders/[id]/page.tsx");
  const recoveryMigration = read("supabase/migrations/202_recoverable_cancelled_purchase_orders.sql");
  const closureMigration = read("supabase/migrations/224_purchasing_cancel_stock_mapping_and_receiving_do.sql");
  const permissions = read("src/server/auth/permissions.ts");

  assert.match(migration, /create or replace function public\.cancel_purchase_request_atomic\(target_purchase_request_id uuid\)/);
  assert.match(approvalRemovalMigration, /manager_review.*admin_review.*finance_review.*ready_to_convert/);
  assert.match(migration, /create or replace function public\.cancel_purchase_order_atomic\(p_purchase_order_id uuid\)/);
  assert.match(migration, /deleted_at = now\(\)/);
  assert.match(migration, /'removed_from_active_work'/);
  assert.match(actions, /rpc\("cancel_purchase_request_atomic"/);
  assert.match(actions, /rpc\("cancel_purchase_order_atomic"/);
  assert.match(prDetail, /Cancel unposted request/);
  assert.match(poDetail, /Cancel purchase order/);
  assert.match(recoveryMigration, /cancelled_recoverable/);
  assert.match(recoveryMigration, /restore_cancelled_purchase_order_atomic/);
  assert.match(poDetail, /const canCancel = \["draft", "pending_approval", "approved"\]\.includes\(order\.status\)/);
  assert.match(closureMigration, /r\.role_code = 'purchasing'/);
  assert.match(closureMigration, /p\.permission_code = 'pr\.cancel'/);
  assert.match(permissions, /purchasing:[\s\S]*"pr\.cancel"/);
});

test("receiving inherits the preflight DO and Stock Balance repairs stay narrowly guarded", () => {
  const migration = read("supabase/migrations/224_purchasing_cancel_stock_mapping_and_receiving_do.sql");
  const poDetail = read("src/app/(app)/purchase-orders/[id]/page.tsx");

  assert.match(migration, /74c7eccc-6604-4f87-9e8b-0c5e2ba207ff/);
  assert.match(migration, /e01e839f-9230-45b4-9a63-10c78d58c2de/);
  assert.match(migration, /expected exactly two active QUIKGROC00025 mappings/);
  assert.match(migration, /inherit_purchase_order_attachments_on_receiving/);
  assert.match(migration, /after insert on public\.goods_receivings/);
  assert.match(poDetail, /AttachmentRequiredAction/);
  assert.match(poDetail, /defaultLabel="Delivery Order"/);
});
