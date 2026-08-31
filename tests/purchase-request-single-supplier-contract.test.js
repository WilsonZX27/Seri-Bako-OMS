import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("supplier resolution is deferred to Purchasing Review and supports later supplier splitting", () => {
  const action = read("src/server/actions/procurement.ts");
  const migration = read("supabase/migrations/152_lossless_non_catalog_purchase_request_lines.sql");
  assert.doesNotMatch(action, /ensureSinglePurchaseRequestSupplier/);
  assert.match(migration, /old\.status::text='admin_review' and new\.status::text='finance_review'/);
  assert.match(migration, /validate_purchase_request_supplier_mappings\(new\.id,true\)/);
  assert.doesNotMatch(migration, /validate_purchase_request_single_supplier\(new\.id\)/);
});

test("Purchasing Review atomically splits a mixed-supplier requisition into one PR per supplier", () => {
  const action = read("src/server/actions/procurement.ts");
  const migration = read("supabase/migrations/153_atomic_supplier_split_purchase_requests.sql");

  assert.match(migration, /transition_action = 'admin_approve'/);
  assert.match(migration, /validate_purchase_request_supplier_mappings\(request_row\.id, true\)/);
  assert.match(migration, /split_root_purchase_request_id/);
  assert.match(migration, /assigned_supplier_id/);
  assert.match(migration, /allocate_supplier_split_pr_number\(request_row\.company_id\)/);
  assert.match(migration, /revoke all on function public\.allocate_supplier_split_pr_number\(uuid\) from public, anon, authenticated/);
  assert.match(migration, /update public\.purchase_request_lines[\s\S]*set purchase_request_id = child_request_id/);
  assert.match(migration, /'split_requests', split_requests/);
  assert.match(migration, /purchase_requests_split_root_supplier_active_idx/);
  assert.match(action, /result\.split_requests\?\.length/);
  assert.match(action, /Finance has been notified for each request/);
});

test("each supplier-specific PR still converts with its own manually entered AutoCount PO number", () => {
  const action = read("src/server/actions/procurement.ts");
  const conversion = read("supabase/migrations/054_sprint_7_5_pr_to_po_supplier_scope_fix.sql");

  assert.match(action, /formData\.get\("autocount_po_no"\)/);
  assert.match(action, /target_po_no: autocountPoNo/);
  assert.match(conversion, /count\(distinct suggested_supplier_id\)/);
  assert.match(conversion, /supplier_count <> 1/);
  assert.match(conversion, /This AutoCount PO Number is already used/);
});

test("stock basket separates supplier and unmapped sourcing groups before creating draft PRs", () => {
  const workspace = read("src/components/stock-balance-workspace.tsx");
  const action = read("src/server/actions/procurement.ts");
  assert.match(workspace, /groupBySupplier/);
  assert.match(workspace, /groupBySupplier/);
  assert.match(workspace, /name="supplier_groups"/);
  assert.match(workspace, /createPurchaseRequestsFromBasket/);
  assert.match(workspace, /supplierId === "unassigned" \? null : supplierId/);
  assert.match(action, /Created \$\{created\.length\} sourcing-grouped draft PR/);
});
