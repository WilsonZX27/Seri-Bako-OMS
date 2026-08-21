const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const badge = fs.readFileSync("src/components/ui/status-badge.tsx", "utf8");

test("workflow stages use distinct stable tones while labels remain the primary meaning", () => {
  for (const status of ["manager_review", "admin_review", "finance_review", "ready_to_convert", "awaiting_grn", "sent_to_supplier"]) {
    assert.match(badge, new RegExp(`${status}:`));
  }
  assert.match(badge, /data-status=\{normalized\}/);
  assert.match(badge, /manager_review:[^\n]+684095/);
  assert.match(badge, /admin_review:[^\n]+245A9C/);
  assert.match(badge, /finance_review:[^\n]+7A5500/);
  assert.match(badge, /ready_to_convert:[^\n]+0B6B61/);
  assert.match(badge, /awaiting_grn:[^\n]+71472C/);
});
