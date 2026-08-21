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

test("master-data filters keep Search available after filtering and size Reset as a command", () => {
  const filters = read("src/components/master-data-filters.tsx");
  const header = read("src/components/common/UnifiedListHeader.tsx");
  assert.match(filters, /data-list-action=\"primary\"/);
  assert.match(filters, /data-list-action=\"secondary\"/);
  assert.match(filters, /<Link href=\{resetHref\}>Reset<\/Link>/);
  assert.match(header, /props\[\"data-list-action\"\] === \"primary\"/);
  assert.match(header, /commandTrackCount/);
});

test("shared list routes do not replace Search with Reset after filtering", () => {
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
    assert.match(source, /data-list-action="primary"/, route);
    assert.match(source, /data-list-action="secondary"/, route);
    assert.doesNotMatch(source, /filtered \? <Button asChild variant="secondary"[\s\S]*: <Button type="submit"/, route);
  }
});
