const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("branch-level inventory views do not calculate balances by location", () => {
  const migration = fs.readFileSync("supabase/migrations/093_branch_level_inventory_read_models.sql", "utf8");
  const removal = fs.readFileSync("supabase/migrations/099_remove_locations_and_make_inventory_branch_owned.sql", "utf8");
  assert.match(migration, /partition by coalesce\(stl\.item_id, st\.item_id\), coalesce\(stl\.branch_id, st\.branch_id\)/);
  assert.doesNotMatch(migration, /partition by coalesce\(stl\.item_id, st\.item_id\), coalesce\(stl\.location_id, st\.location_id\)/);
  assert.match(migration, /group by item_id, item_code, item_name, base_unit, branch_id, branch_name/);
  assert.doesNotMatch(migration, /join public\.locations/);
  assert.match(migration, /Location fields remain only as a temporary write-path compatibility layer/);
  assert.match(migration, /alter view public\.stock_ledger_view set \(security_invoker = true\)/);
  assert.match(migration, /grant select on public\.stock_ledger_view/);
  assert.match(migration, /create view public\.stock_counts_list_view/);
  for (const identifier of ["default_location_id", "location_id", "from_location_id", "to_location_id", "staff_locations", "locations"]) {
    assert.match(removal, new RegExp(`(?:drop column if exists|drop table if exists)[\\s\\S]*${identifier}`));
  }
});

test("current inventory seed APIs accept branch identity only", () => {
  const operations = fs.readFileSync("src/server/queries/stock-operations.ts", "utf8");
  const counts = fs.readFileSync("src/server/queries/stock-counts.ts", "utf8");
  assert.match(operations, /getOperationSeedLines\(branchId\?: string\)/);
  assert.match(counts, /getStockCountSeedLines\(branchId\?: string\)/);
  assert.doesNotMatch(`${operations}\n${counts}`, /_locationId/);
});

test("high-volume inventory lists filter and page in the database", () => {
  const inventory = fs.readFileSync("src/server/queries/inventory.ts", "utf8");
  const counts = fs.readFileSync("src/server/queries/stock-counts.ts", "utf8");

  assert.match(inventory, /rpc\("get_stock_ledger_bounded_page"/);
  assert.match(inventory, /p_offset: exportAll \? 0 : \(page - 1\) \* INVENTORY_PAGE_SIZE/);
  assert.match(inventory, /p_limit: exportAll \? 50000 : INVENTORY_PAGE_SIZE/);
  assert.match(inventory, /from\("stock_balances_summary"\)\.select\("\*", \{ count: "exact" \}\)/);
  assert.match(counts, /from\("stock_counts_list_view"\)\.select\("\*", \{ count: "exact" \}\)/);
  assert.match(counts, /query = query\.range\(\(page - 1\) \* STOCK_COUNT_PAGE_SIZE/);
  assert.doesNotMatch(counts, /supabase\.from\("stock_counts"\)\.select\("\*"\)\.is\("deleted_at", null\)\.order\("updated_at"/);
});
