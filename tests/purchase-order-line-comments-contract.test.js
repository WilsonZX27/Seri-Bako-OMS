const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const migration = fs.readFileSync("supabase/migrations/251_purchase_order_line_comments.sql", "utf8");
const action = fs.readFileSync("src/server/actions/procurement.ts", "utf8");
const detail = fs.readFileSync("src/app/(app)/purchase-orders/[id]/page.tsx", "utf8");

test("purchase order line comments are validated, persisted, and visible", () => {
  assert.match(migration, /alter table public\.purchase_order_lines[\s\S]*add column if not exists remarks text/);
  assert.match(migration, /insert into public\.purchase_order_lines\(purchase_order_id,item_id,qty_ordered,qty_received,qty_cancelled,uom,unit_price,remarks\)/);
  assert.match(migration, /jsonb_to_recordset\(lines\)[\s\S]*remarks text/);
  assert.match(action, /formData\.getAll\("line_remarks"\)/);
  assert.match(detail, /<TableHead>Comment<\/TableHead>/);
  assert.match(detail, /line\.remarks \|\| "—"/);
});
