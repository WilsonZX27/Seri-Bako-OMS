const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/server/queries/purchase-returns.ts", "utf8");

test("purchase return GRN picker projects minimal rows and indexes quantities once", () => {
  const start = source.indexOf("export async function getPostedGoodsReceivingsForReturn");
  const end = source.indexOf("export async function getGoodsReceivingForReturn");
  const boundary = source.slice(start, end);

  assert.doesNotMatch(boundary, /from\("goods_receivings"\)\.select\("\*"\)/);
  assert.doesNotMatch(boundary, /from\("goods_receiving_lines"\)\.select\("\*"\)/);
  assert.match(boundary, /select\("id,grn_no,purchase_order_id,supplier_id,updated_at"\)/);
  assert.match(boundary, /select\("goods_receiving_id,received_qty,returned_qty"\)/);
  assert.match(boundary, /returnableByReceivingId/);
  assert.doesNotMatch(boundary, /\.filter\(\(line\) => line\.goods_receiving_id === grn\.id\)/);
});
