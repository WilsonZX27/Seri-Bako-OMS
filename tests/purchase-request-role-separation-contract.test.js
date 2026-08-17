const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("purchase request approval controls require the owning workflow role", () => {
  const page = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  const actions = read("src/server/actions/procurement.ts");

  assert.match(page, /roleCode === "manager" \|\| isOwner/);
  assert.match(page, /roleCode === "purchasing" \|\| isOwner/);
  assert.match(page, /roleCode === "finance" \|\| isOwner/);
  assert.match(actions, /action === "manager_approve"[\s\S]*\? "manager"/);
  assert.match(actions, /action === "admin_approve"[\s\S]*\? "purchasing"/);
  assert.match(actions, /action === "finance_approve"[\s\S]*\? "finance"/);
  assert.match(actions, /Only the \$\{expectedRole\} role may complete this workflow step/);
});

test("migration removes leaked approval grants from non-owning roles", () => {
  const sql = read("supabase/migrations/157_purchase_request_workflow_role_separation.sql");
  assert.match(sql, /r\.role_code <> 'super_admin'/);
  assert.match(sql, /pr\.manager_approve[\s\S]*r\.role_code <> 'manager'/);
  assert.match(sql, /pr\.admin_review[\s\S]*r\.role_code <> 'purchasing'/);
  assert.match(sql, /pr\.finance_review[\s\S]*r\.role_code <> 'finance'/);
});
