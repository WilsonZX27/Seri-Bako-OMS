const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(process.cwd(), "src/server/queries/purchase-returns.ts"), "utf8");

test("purchase return candidate queries hydrate only referenced rows and fields", () => {
  assert.match(source, /purchase_returns_list_view"\)\.select\("\*", \{ count: "exact" \}\)/);
  assert.match(source, /query\.range\(/);
  assert.match(source, /goods_receivings"\)[\s\S]*?\.select\("id,grn_no,purchase_order_id,supplier_id,updated_at"\)/);
  assert.match(source, /goods_receiving_lines"\)\.select\("goods_receiving_id,received_qty,returned_qty"\)\.in\("goods_receiving_id", receivingIds\)/);
  assert.match(source, /suppliers"\)\.select\("id, name"\)\.in\("id", supplierIds\)/);
});

test("purchase return detail queries hydrate only referenced entities", () => {
  const detail = source.slice(source.indexOf("export async function getPurchaseReturn(id: string)"));
  assert.match(detail, /items"\)\.select\("id, item_code, item_name, base_unit"\)\.in\("id", itemIds\)/);
  assert.match(detail, /goods_receivings"\)\.select\("id, grn_no"\)\.eq\("id", returnRow\.goods_receiving_id\)\.maybeSingle\(\)/);
  assert.match(detail, /stock_transactions"\)\.select\([\s\S]*?\)\.eq\("reference_id", id\)/);
  assert.doesNotMatch(detail, /suppliers"\)\.select\("id, name"\),\s*$/m);
});
