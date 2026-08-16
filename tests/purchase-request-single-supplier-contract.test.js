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

test("stock basket groups selected rows by supplier before creating PRs", () => {
  const workspace = read("src/components/stock-balance-workspace.tsx");
  const action = read("src/server/actions/procurement.ts");
  assert.match(workspace, /groupBySupplier/);
  assert.match(workspace, /Different suppliers will be split into/);
  assert.match(workspace, /name="supplier_groups"/);
  assert.match(workspace, /createPurchaseRequestsFromBasket/);
  assert.match(action, /Created \$\{created\.length\} supplier-grouped draft PR/);
});
