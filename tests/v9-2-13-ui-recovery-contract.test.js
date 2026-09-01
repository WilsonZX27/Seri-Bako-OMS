const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("retirement stays out of count rows and is reversible from the Items filter", () => {
  const count = read("src/components/stock-count-form.tsx");
  const items = read("src/app/(app)/items/page.tsx");
  assert.doesNotMatch(count, /Retirement scheduled|Retires after posting/);
  assert.match(items, /Retired from counts/);
  assert.match(items, /restoreBranchStockCountItem/);
  assert.match(items, />Unretire</);
});

test("FOSIM is a forward-only outlet compliance requirement", () => {
  const migration = read("supabase/migrations/235_add_fosim_outlet_compliance_requirement.sql");
  assert.match(migration, /FOSIM - Food Safety Information System of Malaysia/);
  assert.match(migration, /on conflict \(branch_id, compliance_type_id\) do update/);
});

test("Stock Count post errors retain item identity", () => {
  const action = read("src/server/actions/stock-counts.ts");
  const form = read("src/components/stock-count-form.tsx");
  assert.match(action, /line_item_code/);
  assert.match(action, /formatStockCountDraftError\(error,[^\n]+formData\)/);
  assert.match(form, /name="line_item_code"/);
});
