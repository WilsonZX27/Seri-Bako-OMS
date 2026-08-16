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
  assert.match(page, /className="lg:grid-cols-6"/);
  assert.doesNotMatch(page, /className="grid-cols-3 lg:grid-cols-6"/);
  assert.match(chart, /previewValue:/);
  assert.match(chart, /Received \$\{formatNumber\(row\.received\)\}/);
  assert.match(chart, /Wastage \$\{formatNumber\(row\.wastage\)\}/);
  assert.match(interactive, /onPointerMove=\{handlePointerMove\}/);
  assert.match(interactive, /onKeyDown=\{handleKeyDown\}/);
  assert.match(page, /detailHref=\{\(row\) => outletDailyHref\(row\.id, report\.filters\)\}/);
  assert.match(page, /params = new URLSearchParams\(\{ date \}\)/);
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
  assert.match(page, /<TrendTable[^>]*collapsible/);
  assert.equal((page.match(/<TrendTable[^>]*collapsible/g) ?? []).length, 4);
  assert.match(page, /data-demand-detail-disclosure/);
  assert.match(page, /summary className="flex min-h-11/);
  assert.match(ranking, /onMouseEnter/);
  assert.match(ranking, /onMouseLeave/);
  assert.match(ranking, /onPointerDown/);
  assert.match(ranking, /onClick/);
  assert.match(ranking, /onFocus/);
  assert.match(ranking, /role="region"/);
  assert.match(ranking, /data-ranking-row/);
  assert.match(ranking, /data-ranking-open/);
  assert.match(ranking, /grid min-h-11 w-full[\s\S]*xl:min-h-9/);
  assert.match(ranking, /grid-cols-\[1\.25rem_minmax\(0,1fr\)_auto\] grid-rows-\[auto_auto\]/);
  assert.match(ranking, /col-start-2 col-span-2 row-start-2[\s\S]*xl:col-start-3 xl:col-span-1/);
  assert.match(ranking, /col-start-2[\s\S]*row-start-2[\s\S]*xl:col-start-3[\s\S]*xl:row-start-1/);
  assert.match(ranking, /index \+ 1/);
  assert.match(ranking, /data-ranking-preview[\s\S]*min-h-\[4\.5rem\]/);
  assert.match(ranking, /item\.value <= 0 \? 0 : Math\.max\(3,/);
  assert.doesNotMatch(ranking, /<Link key=\{item\.id\} href=\{item\.href\}/);
  assert.match(ranking, /truncate/);

  const chart = read("src/components/reports/demand-ranking-chart.tsx");
  assert.match(chart, /\.sort\(\(left, right\) =>/);
  assert.match(chart, /right\[metric\] - left\[metric\]/);
  assert.match(chart, /params\.set\("product", row\.id\)/);
  assert.match(chart, /href: `\/reports\/demand-trends\?\$\{params\.toString\(\)\}`/);
  assert.match(chart, /Open applies that product to the report detail/);
});
