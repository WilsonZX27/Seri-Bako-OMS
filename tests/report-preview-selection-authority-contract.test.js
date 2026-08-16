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
  ];

  assert.match(selection, /onMouseEnter/);
  assert.match(selection, /onPointerDown/);
  assert.match(selection, /event\.pointerType !== "mouse"/);
  assert.match(selection, /onFocus[\s\S]*committedSelectionRef\.current = true;[\s\S]*setActiveValue\(value\)/);
  assert.match(selection, /onClick/);
  assert.match(selection, /event\.key === "Escape"/);
  assert.match(selection, /onMouseLeave/);
  assert.match(selection, /matches\(":focus-within"\)/);
  assert.match(selection, /onBlurCapture/);
  assert.match(selection, /contains\(event\.relatedTarget\)/);

  for (const source of consumers) {
    assert.match(source, /usePreviewSelection/);
    assert.doesNotMatch(source, /useRef\(/);
    assert.doesNotMatch(source, /onMouseEnter\s*:/);
    assert.doesNotMatch(source, /onPointerDown\s*:/);
    assert.doesNotMatch(source, /onBlurCapture\s*:/);
  }
});
