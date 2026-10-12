const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(process.cwd(), "src/server/queries/supplier-invoices.ts"), "utf8");

test("invoice creation bounds transactional hydration to eligible company GRNs", () => {
  const candidate = source.slice(source.indexOf("export async function getPostedGrnsForInvoice"), source.indexOf("export async function getSupplierInvoice(id: string)"));
  assert.match(candidate, /supplier_invoices"\)[\s\S]*?\.select\("id"\)[\s\S]*?\.neq\("status", "void"\)[\s\S]*?\.is\("deleted_at", null\)/);
  assert.match(candidate, /goods_receiving_lines"\)\.select\("id, goods_receiving_id, purchase_order_line_id, item_id, ordered_qty, received_qty, uom, unit_cost"\)\.in\("goods_receiving_id", grnIds\)/);
  assert.match(candidate, /supplier_invoice_lines"\)\.select\("supplier_invoice_id, goods_receiving_line_id, invoice_qty"\)\.in\("supplier_invoice_id", \[\.\.\.activeInvoiceIds\]\)/);
  assert.match(candidate, /purchase_order_lines"\)\.select\("id, qty_ordered, unit_price"\)\.in\("id", poLineIds\)/);
  assert.match(candidate, /items"\)\.select\("id, item_code, item_name"\)\.in\("id", itemIds\)/);
  assert.match(candidate, /receivingLinesByGrn = new Map/);
  assert.doesNotMatch(candidate, /receivingLines\.filter/);
  assert.doesNotMatch(candidate, /\.select\("\*"\)/);
});

test("invoice detail only hydrates entities referenced by the invoice and its lines", () => {
  const detail = source.slice(source.indexOf("export async function getSupplierInvoice(id: string)"));
  assert.match(detail, /suppliers"\)\.select\("id, name"\)\.eq\("id", invoice\.supplier_id\)\.maybeSingle\(\)/);
  assert.match(detail, /purchase_orders"\)\.select\("id, po_no"\)\.in\("id", poIds\)/);
  assert.match(detail, /goods_receivings"\)\.select\("id, grn_no"\)\.in\("id", grnIds\)/);
  assert.match(detail, /items"\)\.select\("id, item_code, item_name"\)\.in\("id", itemIds\)/);
});
