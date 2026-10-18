const fs = require("node:fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const read = (path) => fs.readFileSync(path, "utf8");

test("supplier-item identity repair is recoverable and keeps BWY Holdings canonical", () => {
  const migration = read("supabase/migrations/180_reconcile_bwy_supplier_item_identity.sql");
  assert.match(migration, /supplier_item_merge_audit/);
  assert.match(migration, /supplier_code = '406-B003'/);
  assert.match(migration, /supplier_code = '400-Q001'/);
  assert.match(migration, /supplier_item_code = 'BWYHOLDI00003'/);
  assert.match(migration, /status = 'inactive', deleted_at = now\(\)/);
  assert.match(migration, /branch_supplier_items/);
});

test("duplicate supplier merge preserves the PR mapping guard and records unresolved lines", () => {
  const migration = read("supabase/migrations/173_merge_duplicate_supplier_identities.sql");
  assert.match(migration, /supplier_merge_line_audit/);
  assert.match(migration, /repointed_to_canonical_supplier/);
  assert.match(migration, /cleared_requires_supplier_mapping/);
  assert.match(migration, /choose a mapped supplier/);
  assert.doesNotMatch(migration, /session_replication_role/);
  assert.doesNotMatch(
    migration,
    /update public\.purchase_request_lines\s+set suggested_supplier_id = canonical_supplier\.id\s+where suggested_supplier_id = duplicate_supplier\.id/,
  );
});

test("master-data filters expose one visible Search action and keep Reset available", () => {
  const filters = read("src/components/master-data-filters.tsx");
  const header = read("src/components/common/UnifiedListHeader.tsx");
  assert.match(filters, /name="search"/);
  assert.doesNotMatch(filters, />Search<\/Button>/);
  assert.match(filters, /data-list-action=\"secondary\"/);
  assert.match(filters, /<Link href=\{resetHref\}>Reset<\/Link>/);
  assert.match(header, /props\[\"data-list-action\"\] === \"primary\"/);
  assert.match(header, /commandTrackCount/);
  assert.match(header, /unified-list-search-submit/);
  assert.match(header, /showSearchAction = hasTextSearch/);
});

test("shared list routes retain query fields and Reset with the shared Search action", () => {
  const routes = [
    "src/app/(app)/goods-receivings/page.tsx",
    "src/app/(app)/outlet-daily-records/page.tsx",
    "src/app/(app)/purchase-orders/page.tsx",
    "src/app/(app)/purchase-requests/page.tsx",
    "src/app/(app)/purchase-returns/page.tsx",
    "src/app/(app)/stock-card/page.tsx",
    "src/app/(app)/stock-counts/page.tsx",
    "src/app/(app)/supplier-invoices/page.tsx",
  ];
  for (const route of routes) {
    const source = read(route);
    assert.match(source, /FilterBar|UnifiedListHeader/, route);
    assert.match(source, /data-list-action="secondary"/, route);
    assert.doesNotMatch(source, /filtered \? <Button asChild variant="secondary"[\s\S]*: <Button type="submit"/, route);
  }
  const header = read("src/components/common/UnifiedListHeader.tsx");
  assert.match(header, /<span class(?:Name)?="sr-only">Search<\/span>/);
  assert.match(header, /data-search-control/);
  assert.match(header, /closest\?\.\("\[data-search-control\]"\)/);
});

test("supplier register defaults to active identities while keeping an explicit all-status view", () => {
  const statusTabs = read("src/components/status-tabs.tsx");
  const suppliers = read("src/app/(app)/suppliers/page.tsx");
  const query = read("src/server/queries/suppliers.ts");
  assert.match(statusTabs, /defaultStatus = "all"/);
  assert.match(statusTabs, /defaultStatus === "all"/);
  assert.match(suppliers, /const defaultStatus = "active"/);
  assert.match(suppliers, /defaultStatus=\{defaultStatus\}/);
  assert.match(query, /\.is\("deleted_at", null\)/);
});

test("supplier-item search covers the operator group and internal AutoCount code", () => {
  const query = read("src/server/queries/master-data.ts");
  const page = read("src/app/(app)/supplier-items/page.tsx");
  assert.match(query, /supplier_code: supplier\?\.supplier_code/);
  assert.match(query, /supplier_group: supplier\?\.supplier_group/);
  assert.match(query, /\["supplier_name", "supplier_code", "supplier_group"/);
  assert.match(query, /select\("id, name, supplier_code, supplier_group"\)/);
  assert.match(page, /Search supplier, AutoCount code, item group/);
});

test("supplier identity reconciliation repoints relationships before archiving duplicates", () => {
  const migration = read("supabase/migrations/181_reconcile_supplier_identity_relationships.sql");
  assert.match(migration, /supplier_identity_reconciliation_audit/);
  assert.match(migration, /\(nullif\(trim\(s\.supplier_code\), ''\) is not null\) desc/);
  assert.match(migration, /update public\.supplier_items\s+set supplier_id = canonical_supplier\.id/);
  assert.match(migration, /update public\.branch_supplier_items/);
  assert.match(migration, /update public\.purchase_orders/);
  assert.match(migration, /update public\.items\s+set supplier_id = canonical_supplier\.id/);
  assert.match(migration, /set status = 'inactive', deleted_at = coalesce\(deleted_at, now\(\)/);
});
