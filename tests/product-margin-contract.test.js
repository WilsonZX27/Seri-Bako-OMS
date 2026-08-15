const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const query = read("src/server/queries/product-margin.ts");
const page = read("src/app/(app)/reports/product-margin/page.tsx");
const reports = read("src/app/(app)/reports/page.tsx");
const version = read("src/lib/app-version.ts");

test("Product Margin is a protected read-only report", () => {
  assert.equal(fs.existsSync("src/app/(app)/reports/product-margin/page.tsx"), true);
  assert.match(query, /requirePermission\("recipes.view"\)/);
  assert.match(reports, /href: "\/reports\/product-margin"/);
  assert.doesNotMatch(query, /\.(insert|update|delete)\(/);
});

test("Product Margin only uses High recipe confidence and never turns missing cost into zero", () => {
  assert.match(query, /recipe\?\.confidence === "High"/);
  assert.match(query, /status === "Ready" \? Number\(recipe!\.cost_per_output_unit\)/);
  assert.match(query, /!recipes.length \? "Missing recipe"/);
  assert.match(query, /!sellingPrice \? "Missing price"/);
  assert.match(query, /!costReady \? "Cost incomplete"/);
});

test("Product Margin uses neutral bands and clear manual review paths", () => {
  assert.match(query, /packs.length === 1/);
  assert.match(query, /sellingPrice - cost/);
  assert.match(query, /margin \/ sellingPrice/);
  assert.match(query, /"review" : "healthy"/);
  assert.match(page, /Medium and Low are Cost incomplete/);
  assert.match(page, /Missing or ambiguous pricing blocks margin/);
  assert.match(page, /No product margins match these filters/);
  assert.match(page, /No active products to review/);
  assert.match(page, /Review product pricing/);
  assert.match(page, /href=\{`\/recipes\/\$\{row.recipe_id\}`\}/);
});

test("Product Margin has the current footer and scoped Outlet Staff seed", () => {
  assert.match(version, /APP_VERSION = "\d+\.\d+\.\d+"/);
  assert.match(version, /APP_SPRINT = `v\$\{APP_VERSION\}`/);
  assert.match(read("supabase/migrations/066_create_outlet_staff_role.sql"), /outlet_staff/);
});
