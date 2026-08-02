import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/migrations/115_stock_transfer_reservation_partial_receiving.sql", "utf8");
const action = fs.readFileSync("src/server/actions/stock-operations.ts", "utf8");
const detail = fs.readFileSync("src/app/(app)/stock-transfers/[id]/page.tsx", "utf8");
const form = fs.readFileSync("src/components/stock-operation-forms.tsx", "utf8");

test("stock transfer dispatch reserves without formal movements", () => {
  const dispatch = migration.slice(migration.indexOf("create or replace function public.dispatch_stock_transfer_atomic"), migration.indexOf("create or replace function public.receive_stock_transfer_atomic"));
  assert.match(dispatch, /stock_transfer_reservations/);
  assert.match(dispatch, /status = 'in_transit'/);
  assert.doesNotMatch(dispatch, /insert_inventory_movement/);
});

test("stock transfer receiving supports partial quantities and releases remainder", () => {
  assert.match(migration, /receive_stock_transfer_atomic\(p_transfer_id uuid, p_payload jsonb\)/);
  assert.match(migration, /received_quantity/);
  assert.match(migration, /status = 'completed'/);
  assert.match(migration, /status = 'released'/);
  assert.match(migration, /stock_transfer_receipt/);
});

test("stock transfer receiving is idempotent and destination-scoped", () => {
  assert.match(migration, /unique \(stock_transfer_id, idempotency_key\)/);
  assert.match(migration, /already_received/);
  assert.match(migration, /destination inventory branch/);
  assert.match(action, /receive_stock_transfer_atomic/);
  assert.doesNotMatch(action, /rpc\("post_stock_transfer_atomic"/);
});

test("stock transfer rejection is destination-scoped while cancellation is source-scoped", () => {
  assert.match(migration, /next_status = 'cancelled'[\s\S]*?from_branch_id/);
  assert.match(migration, /next_status = 'rejected'[\s\S]*?to_branch_id/);
  assert.match(migration, /reservation released/);
});

test("stock transfer UI exposes explicit receive quantities", () => {
  assert.match(detail, /StockTransferReceiveForm/);
  assert.match(detail, /Confirm received quantities/);
  assert.match(form, /data-stock-transfer-receive-form/);
  assert.match(form, /Receive quantity for/);
  assert.match(form, /Any remainder stays in transit/);
});
