import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");

test("closure wave has current reset ceiling and FK-safe deletion order", () => {
  const reset = read("supabase/maintenance/reset_new_system_data.sql");
  const verify = read("supabase/maintenance/post_reset_new_system_verification.sql");
  assert.match(reset, /migration ceiling 093/);
  assert.ok(reset.indexOf("delete from public.branch_supplier_items") < reset.indexOf("delete from public.supplier_items"));
  assert.match(verify, /migration_ceiling_093/);
});

test("permission aliases and stale identity aliases are evaluated independently", () => {
  const sql = read("supabase/migrations/090_permission_alias_and_identity_hardening.sql");
  const session = read("src/server/auth/staff-session.ts");
  assert.match(sql, /requested as \(select unnest\(permission_codes\)/);
  assert.match(sql, /o\.effect='deny'/);
  assert.match(session, /!staffEmails\.some\(\(value\) => value === normalized\)/);
});

test("default contract test gate and operational recovery boundaries exist", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts.test, "node --test tests/*.test.js");
  assert.match(read("src/app/error.tsx"), /Try again/);
  assert.match(read("src/server/observability/logger.ts"), /REDACTED/);
  assert.match(read("src/app/globals.css"), /--sb-radius-control/);
});

test("stock count branch switching and PR basket preserve branch context", () => {
  const countForm = read("src/components/stock-count-form.tsx");
  const balance = read("src/components/stock-balance-workspace.tsx");
  const basketButtons = read("src/components/stock-balance-table.tsx");
  assert.match(countForm, /setLines\(seedLines\.map/);
  assert.match(countForm, /\[selectedBranchId, seedLines\]/);
  assert.match(balance, /name="line_branch_id" value=\{line\.branch_id \?\? ""\}/);
  assert.doesNotMatch(basketButtons, /onPointerDown=\{\(event\) => \{\s*event\.preventDefault\(\);/);
});
