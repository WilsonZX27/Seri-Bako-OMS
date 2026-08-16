const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("one shared authority owns report preview pointer, touch, and keyboard semantics", () => {
  const selection = read("src/components/ui/use-preview-selection.ts");
  const consumers = [
    read("src/components/ui/interactive-ranking-chart.tsx"),
    read("src/components/reports/aging-distribution-bars.tsx"),
    read("src/components/reports/production-variance-signal-chart.tsx"),
    read("src/components/reports/inventory-daily-movement-chart.tsx"),
  ];

  assert.match(selection, /onMouseEnter/);
  assert.match(selection, /onPointerDown/);
  assert.match(selection, /event\.pointerType === "mouse"[\s\S]*previewValue\(value\)[\s\S]*commitValue\(value\)/);
  assert.match(selection, /const commitValue[\s\S]*committedSelectionRef\.current = true;[\s\S]*setActiveValue\(value\)/);
  assert.match(selection, /onClick/);
  assert.match(selection, /event\.key === "Escape"/);
  assert.match(selection, /onMouseLeave/);
  assert.match(selection, /matches\(":focus-within"\)/);
  assert.match(selection, /onBlurCapture/);
  assert.match(selection, /contains\(event\.relatedTarget\)/);

  for (const source of consumers) {
    assert.match(source, /usePreviewSelection/);
    assert.doesNotMatch(source, /useState\(/);
    assert.doesNotMatch(source, /onMouseEnter\s*:/);
    assert.doesNotMatch(source, /touchSelectionRef/);
    assert.doesNotMatch(source, /onBlurCapture\s*:/);
  }
});
