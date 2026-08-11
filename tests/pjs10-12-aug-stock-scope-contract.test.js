const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const migration = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "migrations", "144_reconcile_pjs10_12_aug_stock_scope.sql"),
  "utf8",
);

test("PJS10 12 Aug repair preserves history and creates the 11 zero-KG gaps", () => {
  assert.match(migration, /CK-PJS10/);
  assert.match(migration, /old_code, item_code/);
  assert.match(migration, /update public\.items/);
  assert.match(migration, /insert into public\.stock_balances_summary/);
  assert.match(migration, /delete from public\.stock_balances_summary summary/);
  assert.match(migration, /legacy\.id <> target_item_id/);
  assert.match(migration, /target_item_id := null/);

  const missingCodes = [
    "FROMPNG00005", "OIYIN00006", "ORIENTAL00014", "ORIENTAL00072",
    "ORIENTAL00087", "QUIKGROC00023", "QUIKGROC00044", "QUIKGROC00090",
    "QUIKGROC00091", "QUIKGROC00107", "QUIKGROC00108",
  ];
  for (const code of missingCodes) assert.match(migration, new RegExp(code));
  assert.equal((migration.match(/\(null, '/g) || []).length, 11);
});
