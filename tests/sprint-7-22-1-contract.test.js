const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("Kitchen receives only the intended PR submit permission", () => {
  const sql = read("supabase/migrations/070_grant_kitchen_pr_submit.sql");
  assert.match(sql, /role_code in \('kitchen', 'kitchen_staff'\)/);
  assert.match(sql, /permission_code = 'pr\.submit'/);
  assert.doesNotMatch(sql, /pr\.view_all|pr\.admin_review|pr\.finance_review|pr\.convert_to_po/);
  assert.match(sql, /Kitchen pr\.submit permission verification failed/);
});

test("PR detail keeps required access stable and optional panels non-fatal", () => {
  const page = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  const query = read("src/server/queries/procurement.ts");
  assert.match(query, /purchase_requests"\)\.select\("\*"\)\.eq\("id", id\)\.maybeSingle\(\)/);
  assert.match(page, /if \(!purchaseRequest\)/);
  assert.match(page, /Purchase request not available/);
  assert.match(page, /getDocumentBundle\(request\.document_id\)\.catch\(\(\) => null\)/);
});

test("Purchasing conversion is state and database-permission driven", () => {
  const page = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  assert.match(page, /request\.status === "ready_to_convert" && permissions\["pr\.convert_to_po"\]/);
  assert.match(page, /name="autocount_po_no"/);
});

test("empty PRs receive an actionable validation message and release is updated", () => {
  assert.match(read("src/server/actions/procurement.ts"), /Add at least one item before creating this purchase request\./);
  const version = read("src/lib/app-version.ts");
  assert.match(version, /7\.23\.5\.3/);
  assert.match(version, /v7\.23\.5\.3/);
});
