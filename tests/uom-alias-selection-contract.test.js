const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("UOM aliases resolve to one canonical value and guided PR repair uses a controlled list", () => {
  const uom = read("src", "lib", "uom.ts");
  const recovery = read("src", "components", "purchase-request-line-recovery.tsx");
  const migration = read("supabase", "migrations", "182_canonicalize_uom_aliases.sql");
  assert.match(uom, /BTL:\s*"BOTTLE"/);
  assert.match(uom, /"GUNI"/);
  assert.match(uom, /localeCompare/);
  assert.match(recovery, /SelectControl name="uom"/);
  assert.doesNotMatch(recovery, /<Input name="uom"/);
  assert.match(recovery, /normalizeUom\(line\.uom\)/);
  assert.match(migration, /update public\.supplier_items[\s\S]*purchase_uom = 'BOTTLE'/);
  assert.match(migration, /update public\.purchase_order_lines[\s\S]*uom = 'BOTTLE'/);
});
