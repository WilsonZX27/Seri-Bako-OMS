import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/migrations/185_progressive_receiving_uom_learning.sql", "utf8");
const form = fs.readFileSync("src/components/goods-receiving-form.tsx", "utf8");
const action = fs.readFileSync("src/server/actions/goods-receivings.ts", "utf8");
const validation = fs.readFileSync("src/lib/validations/procurement.ts", "utf8");

test("progressive receiving persists immutable base snapshots and optional learned conversions", () => {
  assert.match(migration, /received_base_qty numeric/);
  assert.match(migration, /conversion_to_base_uom_snapshot numeric/);
  assert.match(migration, /remember_conversion boolean not null default false/);
  assert.match(migration, /supplier_uom_conversion_audit/);
  assert.match(migration, /app\.purchase_receipt_posting/);
  assert.match(migration, /transaction-local flag/);
  assert.match(migration, /if line\.received_qty>0 and \(line\.received_base_qty is null/);
  assert.match(migration, /if line\.remember_conversion then/);
  assert.match(migration, /conversion_source = proven\.source/);
});

test("progressive receiving migration can be retried after a partial apply", () => {
  assert.match(migration, /create unique index if not exists supplier_items_supplier_item_uom_active_idx/);
  assert.match(migration, /pg_constraint/);
  assert.match(migration, /goods_receiving_lines_received_base_nonnegative/);
  assert.match(migration, /goods_receiving_lines_conversion_snapshot_positive/);
});

test("Goods Receiving leads with Purchase UOM and supports unknown conversions at receipt", () => {
  assert.match(form, /label=\{`Received \(\$\{line\.uom\}\)`\} required/);
  assert.match(form, /name="line_received_base_qty"/);
  assert.match(form, /line_conversion_snapshot/);
  assert.match(form, /Remember this supplier conversion for future deliveries/);
  assert.doesNotMatch(form, /This GRN cannot post until the supplier item is repaired/);
});

test("GRN action validates and forwards both quantity units", () => {
  for (const field of ["received_base_qty", "rejected_base_qty", "conversion_to_base_uom_snapshot", "remember_conversion"]) {
    assert.match(validation, new RegExp(field));
    assert.match(action, new RegExp(`line_${field.replaceAll("received_base_qty", "received_base_qty").replaceAll("rejected_base_qty", "rejected_base_qty").replaceAll("conversion_to_base_uom_snapshot", "conversion_snapshot")}|${field}`));
  }
});
