import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("supplier UOM stays document-facing while GRN and returns post base quantities and cost", () => {
  const migration = read("supabase", "migrations", "175_supplier_uom_inventory_posting.sql");
  assert.match(migration, /post_goods_receiving_atomic\(p_goods_receiving_id uuid/);
  assert.match(migration, /si\.conversion_to_base_uom/);
  assert.match(migration, /base_received_qty := line\.received_qty \* conversion/);
  assert.match(migration, /base_unit_cost := case when conversion = 0 then line\.unit_cost else line\.unit_cost \/ conversion end/);
  assert.match(migration, /insert_inventory_movement\('ST-'\|\|grn\.grn_no/);
  assert.match(migration, /base_return_qty := line\.return_qty \* conversion/);
  assert.match(migration, /Supplier UOM conversion is missing/);
  assert.match(migration, /grant execute on function public\.post_goods_receiving_atomic\(uuid,text\), public\.post_purchase_return_atomic\(uuid\) to authenticated/);
});

