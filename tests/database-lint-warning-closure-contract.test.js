const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const sql = fs.readFileSync(path.resolve(__dirname, "..", "supabase", "migrations", "213_database_lint_warning_closure.sql"), "utf8");
test("database lint warning closure repairs renamed barcode and intentional compatibility parameters", () => {
  assert.match(sql, /barcode_mappings/);
  assert.match(sql, /perform target_requested_by/);
  assert.match(sql, /perform p_item_id; perform p_actor_id/);
  assert.match(sql, /preview_phase_one_hard_delete_v059/);
});
