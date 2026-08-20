const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

test("Outlet Daily clears obsolete wastage details when quantity returns to zero", () => {
  const form = read("src/components/outlet-daily-record-form.tsx");
  assert.match(form, /Number\(next \|\| 0\) <= 0[\s\S]*setReason\(""\)[\s\S]*setRemark\(""\)[\s\S]*setRemarkOpen\(false\)/);
});

test("Stock Balance groups related operational values into compact fields", () => {
  const workspace = read("src/components/stock-balance-workspace.tsx");
  const rows = read("src/components/stock-balance-table.tsx");
  assert.match(workspace, /Available \/ Reserved/);
  assert.match(workspace, /Avg Cost \/ Value/);
  assert.doesNotMatch(workspace, /<TableHead className="text-right">Reserved<\/TableHead>/);
  assert.match(rows, /reserved<\/span>/);
  assert.match(rows, /value<\/span>/);
});

test("Stock Count keeps document identity and submitter in one compact field", () => {
  const page = read("src/app/(app)/stock-counts/page.tsx");
  assert.match(page, /SC No \/ Submitted by/);
  assert.match(page, /Unknown submitter/);
  assert.doesNotMatch(page, /<TableHead>Submitted by<\/TableHead>/);
});

test("Supplier destructive actions are hidden without update permission", () => {
  const page = read("src/app/(app)/suppliers/[id]/page.tsx");
  assert.match(page, /hasPermission\("suppliers\.update"\)/);
  assert.match(page, /!canUpdate \? null/);
  assert.match(page, /lifecycleAction \? <RecordActionPanel title="Lifecycle">/);
});

test("AutoCount preserves existing item cost while GRN posting owns actual cost", () => {
  const migration = read("supabase/migrations/171_fix_autocount_import_confirm.sql");
  const grnPosting = read("supabase/migrations/099_remove_locations_and_make_inventory_branch_owned.sql");
  const inventoryModel = read("supabase/migrations/128_inventory_preaggregation.sql");

  assert.match(migration, /insert into public\.items[\s\S]*standard_cost/);
  assert.doesNotMatch(migration, /update public\.items set[\s\S]{0,500}cost\s*=/);
  assert.match(grnPosting, /insert_inventory_movement\([\s\S]*line\.unit_cost/);
  assert.match(inventoryModel, /purchase_cost \/ total_quantity_in else 0 end as average_cost/);
});
