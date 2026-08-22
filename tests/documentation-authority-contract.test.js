const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const product = fs.readFileSync("PRODUCT.md", "utf8");
const design = fs.readFileSync("DESIGN.md", "utf8");
const schema = fs.readFileSync("docs/SCHEMA_RELATIONSHIP_MAP_2026-07-23.md", "utf8");
const metrics = fs.readFileSync("docs/analytics/METRIC_DICTIONARY.md", "utf8");
const version = fs.readFileSync("src/lib/app-version.ts", "utf8").match(/APP_VERSION = "([^"]+)"/)?.[1];
const migrationCeiling = Math.max(...fs.readdirSync("supabase/migrations").map((name) => Number(name.match(/^(\d+)_/)?.[1] ?? 0)));

test("product and design baselines identify released authority and the current forward patch", () => {
  assert.ok(version);
  const currentSection = new RegExp(`v${version.replaceAll(".", "\\.")} \\((?:deployed|unreleased)\\)`);
  assert.match(product, currentSection);
  assert.match(design, currentSection);
  assert.match(product, /current released application baseline is `v\d+\.\d+\.\d+`/);
  assert.match(design, /currently released application is `v\d+\.\d+\.\d+`/);
  assert.match(design, /versioned section above that number is[\s\S]*unreleased implementation note/);
  assert.doesNotMatch(product, /current application baseline is `v7\.87\.0/);
  assert.doesNotMatch(product, /Current integration baseline: `v7\.63\.0/);
});

test("schema documentation distinguishes its historical snapshot from repository migration authority", () => {
  assert.ok(migrationCeiling >= 156);
  assert.match(product, new RegExp(`migrations reviewed through \`${migrationCeiling}\``));
  assert.match(schema, new RegExp(`forward-only migration 历史已到 \`${migrationCeiling}\``));
  assert.match(schema, /历史实库快照，不是当前 Production schema 证明/);
  for (const migration of [128, 138, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156]) assert.match(schema, new RegExp(`\`${migration}\``));
});

test("metric dictionary records trust, freshness, unavailable, accessibility and drill-through contracts", () => {
  for (const metric of ["Dashboard attention summary", "Demand Trend Lite", "Inventory daily movement activity", "Stock Count variance insight", "AP Aging distribution", "Cash Flow payable pressure", "Procurement Variance", "Product Margin"]) assert.match(metrics, new RegExp(metric));
  assert.match(metrics, /render timestamp is never a data-freshness timestamp/);
  assert.match(metrics, /Query failure must render unavailable, never zero/);
  assert.match(metrics, /numeric table\/list alternative/);
  assert.match(metrics, /Drill-through/);
  assert.match(metrics, /Windows are mutually exclusive/);
});
