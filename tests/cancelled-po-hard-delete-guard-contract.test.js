const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const sql = fs.readFileSync(path.resolve(__dirname, "..", "supabase", "migrations", "211_fix_cancelled_po_hard_delete_guard.sql"), "utf8");

test("cancelled PO hard delete has a narrow Owner RPC bypass without weakening normal line locks", () => {
  assert.match(sql, /current_setting\('app\.phase_one_hard_delete', true\) = 'on'/);
  assert.match(sql, /perform set_config\('app\.phase_one_hard_delete', 'on', true\)/);
  assert.match(sql, /perform set_config\('app\.phase_one_hard_delete', 'off', true\)/);
  assert.match(sql, /if order_status <> 'draft' then/);
  assert.match(sql, /preview_phase_one_hard_delete\(record_type, record_id\)/);
  assert.match(sql, /Owner \/ Super Admin access is required/);
});
