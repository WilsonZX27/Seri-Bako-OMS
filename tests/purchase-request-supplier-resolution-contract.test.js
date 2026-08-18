const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const migration = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "migrations", "166_resolve_legacy_purchase_request_suppliers.sql"),
  "utf8",
);

test("legacy PR supplier resolution is deterministic and branch/UOM scoped", () => {
  assert.match(migration, /resolve_purchase_request_line_suppliers/);
  assert.match(migration, /bsi\.branch_id = request_row\.branch_id/);
  assert.match(migration, /bsi\.item_id = line_row\.item_id/);
  assert.match(migration, /upper\(trim\(si\.purchase_uom\)\) = upper\(trim\(line_row\.uom\)\)/);
  assert.match(migration, /candidate_count = 1/);
  assert.match(migration, /preferred_count = 1/);
  assert.match(migration, /suggested_supplier_id is null/);
  assert.match(migration, /Every item needs a supplier mapped to this branch and unit/);
  assert.match(migration, /revoke all on function public\.resolve_purchase_request_line_suppliers/);
});
