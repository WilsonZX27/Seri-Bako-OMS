const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("shared ranking previews distinguish transient hover from committed drill-through selection", () => {
  const source = read("src/components/ui/interactive-ranking-chart.tsx");
  assert.match(source, /onMouseEnter/);
  assert.match(source, /onMouseLeave/);
  assert.match(source, /if \(!touchSelectionRef\.current\) setActiveId\(null\)/);
  assert.doesNotMatch(source, /!touchSelectionRef\.current && !item\.href/);
  assert.match(source, /onPointerDown/);
  assert.match(source, /data-ranking-preview/);
  assert.match(source, /aria-live="polite"/);
});

test("shared line previews remain discoverable to assistive technology after pointer or keyboard selection", () => {
  const source = read("src/components/ui/interactive-line-chart.tsx");
  assert.match(source, /data-chart-active-index=\{activeIndex \?\? undefined\}/);
  assert.match(source, /role="tooltip"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /aria-roledescription="interactive line chart"/);
  assert.match(source, /data-chart-data-list/);
  assert.match(source, /onPointerMove/);
  assert.match(source, /onKeyDown/);
  assert.match(source, /points\.length === 1/);
  assert.match(source, /textAnchor="middle"/);
});

test("aging and production previews use the shared persistent touch and focus contract", () => {
  const aging = read("src/components/reports/aging-distribution-bars.tsx");
  const production = read("src/components/reports/production-variance-signal-chart.tsx");
  for (const source of [aging, production]) {
    assert.match(source, /onPointerDown/);
    assert.match(source, /onMouseLeave/);
    assert.match(source, /onBlur/);
    assert.match(source, /aria-controls(?:=\{previewId\}|["']?: previewId)/);
    assert.match(source, /aria-live="polite"/);
  }
});

test("report preview slots stay stable before selection", () => {
  const ranking = read("src/components/ui/interactive-ranking-chart.tsx");
  const aging = read("src/components/reports/aging-distribution-bars.tsx");
  const production = read("src/components/reports/production-variance-signal-chart.tsx");
  const inventory = read("src/components/reports/inventory-daily-movement-chart.tsx");
  assert.match(ranking, /data-ranking-preview[\s\S]*min-h-\[4\.5rem\][\s\S]*border/);
  assert.match(aging, /data-aging-preview[\s\S]*min-h-\[4\.5rem\][\s\S]*border/);
  assert.match(production, /data-production-signal-preview/);
  assert.match(production, /min-h-\[3\.75rem\][\s\S]*border/);
  assert.match(inventory, /data-inventory-movement-preview/);
  assert.match(inventory, /min-h-\[4\.5rem\][\s\S]*border/);
  for (const source of [ranking, aging, production, inventory]) assert.doesNotMatch(source, /(?:!active(?:Item)?|activePoint \?)[\s\S]{0,80}"sr-only"/);
});

test("Demand Trend uses the shared filter surface without an extra wrapper card", () => {
  const page = read("src/app/(app)/reports/demand-trends/page.tsx");
  assert.match(page, /<FilterBar resetHref="\/reports\/demand-trends"(?: className="sb-list-filters--balanced")?>/);
  assert.doesNotMatch(page, /<div className="overflow-hidden border bg-card"><FilterBar/);
});

test("Demand Trend keeps unavailable charts explicit instead of implying zero", () => {
  const trend = read("src/components/reports/demand-trend-chart.tsx");
  const ranking = read("src/components/reports/demand-ranking-chart.tsx");
  assert.match(trend, /data-demand-trend-empty/);
  assert.match(trend, /not shown as zero/);
  assert.match(ranking, /data-demand-ranking-empty/);
  assert.match(ranking, /not shown as zero/);
});
