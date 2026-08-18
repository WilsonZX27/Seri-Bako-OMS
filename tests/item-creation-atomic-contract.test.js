const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const migration = read("supabase/migrations/168_atomic_operational_item_creation.sql");
const action = read("src/server/actions/items.ts");
const form = read("src/components/item-form.tsx");
const page = read("src/app/(app)/items/new/page.tsx");
const types = read("src/types/database.ts");
const detailPage = read("src/app/(app)/items/[id]/page.tsx");
const masterDataQueries = read("src/server/queries/master-data.ts");

test("operational item creation is one protected transaction boundary", () => {
  assert.match(migration, /create or replace function public\.create_operational_item/);
  assert.match(migration, /security definer[\s\S]*set search_path = public/);
  assert.match(migration, /has_permission\('items\.create'\)/);
  assert.match(migration, /has_permission\('supplier_items\.create'\)/);
  assert.match(migration, /insert into public\.items/);
  assert.match(migration, /insert into public\.supplier_items/);
  assert.match(migration, /insert into public\.branch_supplier_items/);
  assert.match(migration, /'master_only'/);
  assert.match(migration, /'supplier_ready'/);
  assert.match(migration, /'branch_ready'/);
  assert.match(migration, /revoke all on function public\.create_operational_item/);
});

test("item creation form exposes optional sourcing without duplicating item identity", () => {
  assert.match(form, /Default sourcing/);
  assert.match(form, /supplier_purchase_uom/);
  assert.match(form, /supplier_conversion_to_base_uom/);
  assert.match(form, /name="branch_ids"/);
  assert.doesNotMatch(form, /name="supplier_item_code"/);
  assert.match(action, /rpc\("create_operational_item"/);
  assert.match(action, /readiness/);
  assert.match(types, /create_operational_item:/);
  assert.match(page, /getBranchesForSelect\(\{ restrictToActorScope: true \}\)/);
});

test("item detail explains sourcing readiness without replacing the mapping write authority", () => {
  assert.match(masterDataQueries, /getItemSourcingReadiness/);
  assert.match(masterDataQueries, /\.from\("supplier_items"\)/);
  assert.match(masterDataQueries, /\.from\("branch_supplier_items"\)/);
  assert.match(detailPage, /Sourcing readiness/);
  assert.match(detailPage, /sourcing\.status/);
  assert.match(detailPage, /supplier-items\/new\?itemId=/);
  assert.match(detailPage, /supplier-items\?search=/);
});
