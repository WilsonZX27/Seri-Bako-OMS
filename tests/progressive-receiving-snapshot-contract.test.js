const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migration = fs.readFileSync("supabase/migrations/189_guard_receiving_conversion_snapshot.sql", "utf8");

test("receiving derives an immutable conversion snapshot from actual quantities", () => {
  assert.match(migration, /ensure_goods_receiving_line_conversion_snapshot/);
  assert.match(migration, /received_base_qty\s*\/\s*new\.received_qty/);
  assert.match(migration, /rejected_base_qty\s*\/\s*new\.rejected_qty/);
  assert.match(migration, /before insert or update of received_qty, rejected_qty, received_base_qty, rejected_base_qty, conversion_to_base_uom_snapshot/);
  assert.match(migration, /receiving_confirmed/);
  assert.match(migration, /revoke all on function public\.ensure_goods_receiving_line_conversion_snapshot\(\) from public, anon/);
});
