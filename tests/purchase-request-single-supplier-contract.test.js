import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("purchase request submission is single-supplier at both action and database boundaries", () => {
  const action = read("src/server/actions/procurement.ts");
  const migration = read("supabase/migrations/105_purchase_request_single_supplier.sql");
  assert.match(action, /ensureSinglePurchaseRequestSupplier/);
  assert.match(action, /A purchase request can contain items from only one supplier/);
  assert.match(migration, /count\(distinct suggested_supplier_id\)/);
  assert.match(migration, /validate_purchase_request_supplier_mappings\(new\.id, true\)/);
  assert.match(migration, /validate_purchase_request_single_supplier\(new\.id\)/);
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
