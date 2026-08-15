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
  assert.match(source, /onPointerMove/);
  assert.match(source, /onKeyDown/);
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
