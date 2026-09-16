const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const migration = fs.readFileSync("supabase/migrations/296_repair_pjs10_stock_count_catalog.sql", "utf8");
const actions = fs.readFileSync("src/server/actions/stock-counts.ts", "utf8");
const form = fs.readFileSync("src/components/stock-count-form.tsx", "utf8");

test("PJS10 catalog repair restores named items and aligns verified KG units", () => {
  for (const code of ["OIYIN00023", "QUIKGROC00060", "QUIKGROC00051", "QUIKGROC00128", "QUIKGROC00138"]) {
    assert.match(migration, new RegExp(code));
  }
  assert.match(migration, /'QUIKGROC00138','QUIKGROC00138','CORN FLOUR'/);
  assert.match(migration, /item_code in \('QUIKGROC00051','QUIKGROC00060','QUIKGROC00128'\)/);
  assert.match(migration, /insert into public\.branch_stock_count_items/);
});

test("nonzero physical stock cannot be retired from future counts", () => {
  assert.match(migration, /entry\.actual_qty<>0/);
  assert.match(actions, /max\(0, "An item can retire only after its final physical count is zero\."\)/);
  assert.match(form, /An item can retire only when this count is zero\./);
  assert.match(form, /physicalQty \?\? 0\) !== 0/);
});
