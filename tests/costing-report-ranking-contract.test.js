const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("product margin exposes a compact preview-first readiness and margin ranking", () => {
  const page = read("src/app/(app)/reports/product-margin/page.tsx");
  const insights = read("src/components/reports/costing-report-insights.tsx");

  assert.match(page, /<ProductMarginInsights rows=\{rows\}/);
  assert.match(insights, /data-product-margin-insights/);
  assert.match(insights, /Product margin readiness distribution/);
  assert.match(insights, /slice\(0, 5\)/);
  assert.match(insights, /Math\.abs\(row\.gross_margin_amount \?\? 0\)/);
  assert.match(insights, /Absolute RM size determines rank; the displayed margin keeps its direction/);
  assert.match(insights, /this is not a pricing recommendation/);
  assert.match(insights, /href: `\/products\/\$\{row\.id\}`/);

  const workspace = page.indexOf("<WorkspaceGrid");
  const filters = page.indexOf("<FilterBar", workspace);
  const charts = page.indexOf("<ProductMarginInsights", workspace);
  const detail = page.indexOf("<section className=\"sb-list-content-card", workspace);
  assert.ok(workspace >= 0 && filters > workspace && charts > filters && detail > charts, "Product Margin must keep filters, insights, and detail in one ordered workspace");
  assert.doesNotMatch(page, /px-3 pt-3 sm:px-4[^>]*><ProductMarginInsights/);
});

test("recipe costing ranks only usable cost authority and preserves Low as incomplete", () => {
  const page = read("src/app/(app)/reports/recipe-costing/page.tsx");
  const insights = read("src/components/reports/costing-report-insights.tsx");
  const ranking = read("src/components/ui/interactive-ranking-chart.tsx");

  assert.match(page, /<RecipeCostingInsights rows=\{rows\}/);
  assert.match(insights, /data-recipe-costing-insights/);
  assert.match(insights, /row\.confidence !== "Low" && row\.cost_per_output_unit != null/);
  assert.match(insights, /Cost per output is incomplete and must not be treated as zero/);
  assert.match(insights, /Top five High or Medium confidence estimates; Low confidence costs remain excluded/);
  assert.match(insights, /href: `\/recipes\/\$\{row\.id\}`/);
  assert.match(ranking, /onMouseEnter/);
  assert.match(ranking, /onPointerDown/);
  assert.match(ranking, /onFocus/);
  assert.match(ranking, /aria-pressed/);
  assert.match(ranking, /data-ranking-open/);

  const workspace = page.indexOf("data-recipe-costing-workspace");
  const filters = page.indexOf("<FilterBar", workspace);
  const charts = page.indexOf("<RecipeCostingInsights", workspace);
  const detail = page.indexOf("<section className=\"sb-list-content-card", workspace);
  assert.ok(workspace >= 0 && filters > workspace && charts > filters && detail > charts, "Recipe Costing must keep filters, insights, and detail in one ordered workspace");
  assert.doesNotMatch(page, /px-3 pt-3 sm:px-4[^>]*><RecipeCostingInsights/);
});
