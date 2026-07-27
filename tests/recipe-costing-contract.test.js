const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const query = read("src/server/queries/recipe-costing.ts");
const page = read("src/app/(app)/reports/recipe-costing/page.tsx");
const reports = read("src/app/(app)/reports/page.tsx");
const version = read("src/lib/app-version.ts");

test("Recipe Costing is a protected read-only report", () => {
  assert.equal(fs.existsSync("src/app/(app)/reports/recipe-costing/page.tsx"), true);
  assert.match(query, /requirePermission\("recipes.view"\)/);
  assert.match(reports, /href: "\/reports\/recipe-costing"/);
  assert.doesNotMatch(query, /\.(insert|update|delete)\(/);
});

test("Recipe Costing keeps item base-UOM cost gaps and mismatches explicit", () => {
  assert.match(query, /Number\(item.cost\) <= 0/);
  assert.match(query, /line.base_uom !== item.base_unit/);
  assert.match(query, /Number\(line.base_qty_required\) \* Number\(item.cost\)/);
  assert.match(query, /total_ingredient_cost: total/);
  assert.match(query, /cost_per_output_unit: total != null && outputQty \? total \/ outputQty : null/);
  assert.match(query, /uom_mismatch_count: uomMismatchCount/);
  assert.match(page, /A UOM mismatch is not estimated/);
  assert.match(page, /Missing cost is not counted as zero/);
});

test("Recipe Costing surfaces confidence, manual actions, filters, and the existing recipe detail", () => {
  assert.match(query, /const confidence = !complete \? "Low" : warning \? "Medium" : "High"/);
  assert.match(page, /name="missing_cost"/);
  assert.match(page, /Missing cost only/);
  assert.match(page, /Low confidence/);
  assert.match(page, /row.confidence === "Low" \? "Incomplete"/);
  for (const action of ["Add item cost", "Align UOM", "Add recipe output", "Add recipe lines"]) assert.match(query, new RegExp(action));
  assert.match(page, /href=\{`\/recipes\/\$\{row.id\}`\}/);
});

test("Recipe Costing remains compatible with the current footer and scoped Outlet Staff seed", () => {
  assert.match(version, /APP_VERSION = "\d+\.\d+\.\d+"/);
  assert.match(version, /APP_SPRINT = `v\$\{APP_VERSION\}`/);
  assert.match(read("supabase/migrations/066_create_outlet_staff_role.sql"), /outlet_staff/);
});
