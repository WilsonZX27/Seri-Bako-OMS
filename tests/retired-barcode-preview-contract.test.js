const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const sql = fs.readFileSync(path.resolve(__dirname, "..", "supabase", "migrations", "214_remove_retired_barcode_preview_dependency.sql"), "utf8");
test("retired barcode tables are removed from executable hard-delete preview SQL", () => {
  assert.match(sql, /select 0 into c/);
  assert.match(sql, /preview_phase_one_hard_delete_v057/);
});
