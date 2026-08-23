const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("piece aliases normalize to PCS across product writes and existing data", () => {
  const uom = read("src/lib/uom.ts");
  const actions = read("src/server/actions/products.ts");
  const imports = read("src/app/api/imports/confirm/route.ts");
  const migration = read("supabase/migrations/198_canonicalize_piece_uom_to_pcs.sql");
  assert.match(uom, /PIECE: "PCS"/);
  assert.match(uom, /PIECES: "PCS"/);
  assert.match(actions, /selling_unit: normalizeUom/);
  assert.match(actions, /selling_uom: normalizeUom/);
  assert.match(imports, /selling_unit: normalizeUom\(row\.selling_unit\)/);
  assert.match(migration, /update public\.products[\s\S]*'PIECE', 'PIECES'/);
  assert.match(migration, /update public\.product_packaging/);
  assert.match(migration, /update public\.recipes/);
});
