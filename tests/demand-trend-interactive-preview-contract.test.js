const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Demand Trend exposes a direct hover, touch, and keyboard preview", () => {
  const page = read("src/app/(app)/reports/demand-trends/page.tsx");
  const chart = read("src/components/reports/demand-trend-chart.tsx");
  const interactive = read("src/components/ui/interactive-line-chart.tsx");

  assert.match(page, /<DemandTrendChart rows=\{report\.daily\} \/>/);
  assert.match(chart, /previewValue:/);
  assert.match(chart, /Received \$\{formatNumber\(row\.received\)\}/);
  assert.match(chart, /Wastage \$\{formatNumber\(row\.wastage\)\}/);
  assert.match(interactive, /onPointerMove=\{handlePointerMove\}/);
  assert.match(interactive, /onKeyDown=\{handleKeyDown\}/);
  assert.match(interactive, /role="tooltip"/);
});

test("Dense 30-day trends do not render a permanent marker for every point", () => {
  const interactive = read("src/components/ui/interactive-line-chart.tsx");
  assert.match(interactive, /points\.length <= 14 \? points\.map/);
});

test("Top movement and wastage use touch-friendly ranking previews with progressive detail", () => {
  const page = read("src/app/(app)/reports/demand-trends/page.tsx");
  const ranking = read("src/components/ui/interactive-ranking-chart.tsx");

  assert.match(page, /metric="movement"/);
  assert.match(page, /metric="wastage"/);
  assert.match(page, /searchParams=\{\{ period: report\.filters\.period, branch: report\.filters\.branch, status: report\.filters\.status \}\}/);
  assert.match(page, /collapsible \/>/);
  assert.match(ranking, /onMouseEnter/);
  assert.match(ranking, /onMouseLeave/);
  assert.match(ranking, /onPointerDown/);
  assert.match(ranking, /onClick/);
  assert.match(ranking, /onFocus/);
  assert.match(ranking, /role="region"/);
  assert.match(ranking, /data-ranking-row/);
  assert.match(ranking, /data-ranking-open/);
  assert.match(ranking, /grid min-h-11 w-full[\s\S]*xl:min-h-9/);
  assert.match(ranking, /item\.value <= 0 \? 0 : Math\.max\(3,/);
  assert.doesNotMatch(ranking, /<Link key=\{item\.id\} href=\{item\.href\}/);
  assert.match(ranking, /truncate/);

  const chart = read("src/components/reports/demand-ranking-chart.tsx");
  assert.match(chart, /params\.set\("product", row\.id\)/);
  assert.match(chart, /href: `\/reports\/demand-trends\?\$\{params\.toString\(\)\}`/);
  assert.match(chart, /Open applies that product to the report detail/);
});
