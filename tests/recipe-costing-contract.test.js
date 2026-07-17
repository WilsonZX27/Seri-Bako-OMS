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
  assert.match(query, /requirePermission\("reports.view"\)/);
  assert.match(reports, /href: "\/reports\/recipe-costing"/);
  assert.doesNotMatch(query, /\.(insert|update|delete)\(/);
});

test("Recipe Costing uses the normalized item base-UOM cost without inventing missing values", () => {
  assert.match(query, /Number\(item.cost\) <= 0/);
  assert.match(query, /line.base_uom !== item.base_unit/);
  assert.match(query, /Number\(line.base_qty_required\) \* Number\(item.cost\)/);
  assert.match(query, /total_ingredient_cost: total/);
  assert.match(query, /cost_per_output_unit: total != null && outputQty \? total \/ outputQty : null/);
  assert.match(page, /Supplier prices and recipe-line costs are not substituted/);
});

test("Recipe Costing surfaces confidence, filters, and the existing recipe detail", () => {
  assert.match(query, /const confidence = !complete \? "Low" : warning \? "Medium" : "High"/);
  assert.match(page, /name="missing_cost"/);
  assert.match(page, /Missing cost only/);
  assert.match(page, /href=\{`\/recipes\/\$\{row.id\}`\}/);
});

test("Recipe Costing has the Sprint 7.19 footer and adds no migration 066", () => {
  assert.match(version, /APP_VERSION = "0\.2\.27"/);
  assert.match(version, /APP_SPRINT = "Sprint 7\.19"/);
  assert.equal(fs.readdirSync("supabase/migrations").some((file) => file.startsWith("066_")), false);
});
