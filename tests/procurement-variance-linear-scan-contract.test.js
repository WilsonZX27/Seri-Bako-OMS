import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/server/queries/procurement-variance.ts", "utf8");

test("procurement variance indexes linked rows once instead of rescanning complete datasets", () => {
  assert.match(source, /receivingLinesByOrderLine/);
  assert.match(source, /invoiceLinesByReceivingAndOrderLine/);
  assert.match(source, /supplierItemsByIdentity/);
  assert.doesNotMatch(source, /data\.receivingLines\.filter\(/);
  assert.doesNotMatch(source, /data\.invoiceLines\.filter\(/);
  assert.doesNotMatch(source, /data\.supplierItems\.filter\(/);
});

test("procurement variance reads only calculation fields", () => {
  for (const table of [
    "purchase_orders",
    "purchase_order_lines",
    "goods_receivings",
    "goods_receiving_lines",
    "supplier_invoices",
    "supplier_invoice_lines",
    "suppliers",
    "items",
    "supplier_items",
  ]) {
    const query = source.match(new RegExp(`from\\(\\"${table}\\"\\)\\.select\\(\\"([^\\"]+)\\"\\)`));
    assert.ok(query, `${table} must use an explicit projection`);
    assert.notEqual(query[1], "*");
  }
});
