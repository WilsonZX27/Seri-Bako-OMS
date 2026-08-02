const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("unposted procurement cancellation removes active work through dedicated RPCs", () => {
  const migration = read("supabase/migrations/120_unposted_procurement_cancel_removes_active_work.sql");
  const actions = read("src/server/actions/procurement.ts");
  const prDetail = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  const poDetail = read("src/app/(app)/purchase-orders/[id]/page.tsx");

  assert.match(migration, /create or replace function public\.cancel_purchase_request_atomic\(target_purchase_request_id uuid\)/);
  assert.match(migration, /create or replace function public\.cancel_purchase_order_atomic\(p_purchase_order_id uuid\)/);
  assert.match(migration, /deleted_at = now\(\)/);
  assert.match(migration, /'removed_from_active_work'/);
  assert.match(actions, /rpc\("cancel_purchase_request_atomic"/);
  assert.match(actions, /rpc\("cancel_purchase_order_atomic"/);
  assert.match(prDetail, /Delete draft/);
  assert.match(poDetail, /Delete unposted order/);
});
