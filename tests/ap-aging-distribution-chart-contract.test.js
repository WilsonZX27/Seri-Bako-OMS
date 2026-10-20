const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src/app/(app)/supplier-invoices/aging/page.tsx"), "utf8");
const chart = fs.readFileSync(path.join(root, "src/components/reports/aging-distribution-bars.tsx"), "utf8");
const selection = fs.readFileSync(path.join(root, "src/components/ui/use-preview-selection.ts"), "utf8");

test("AP Aging renders ordered direct-label distribution bars from the report buckets", () => {
  assert.match(page, /<AgingDistributionBars items=\{agingDistribution\}/);
  assert.match(page, /outstanding: report\.buckets\[key\]\?\.outstanding \?\? 0/);
  assert.match(page, /invoiceCount: report\.buckets\[key\]\?\.invoice_count \?\? 0/);
  assert.match(chart, /Outstanding by aging bucket/);
  assert.match(chart, /formatCurrency\(item\.outstanding\)/);
  assert.match(chart, /item\.invoiceCount/);
  assert.match(chart, /grid-cols-\[minmax\(0,1fr\)_auto\] grid-rows-\[auto_auto\]/);
  assert.match(chart, /xl:grid-cols-\[minmax\(7rem,1fr\)_minmax\(5rem,1\.4fr\)_auto\]/);
  assert.match(chart, /title=\{item\.label\}/);
});

test("Every aging bar preserves current filters and drills into the same invoice table", () => {
  assert.match(page, /params\.set\("bucket", bucket\)/);
  assert.match(page, /params\.delete\("page"\)/);
  assert.match(chart, /data-aging-bucket/);
  assert.match(chart, /href=\{activeItem\.href\}/);
  assert.match(chart, /data-aging-open/);
  assert.match(chart, /usePreviewSelection<string>\(\)/);
  assert.match(chart, /\.\.\.optionProps\(item\.key\)/);
  assert.match(chart, /\.\.\.boundaryProps/);
  assert.match(selection, /onFocus/);
  assert.match(selection, /onBlurCapture/);
  assert.match(selection, /event\.currentTarget\.contains\(event\.relatedTarget\)/);
  assert.match(chart, /role="region"/);
  assert.match(chart, /aria-pressed/);
  assert.match(chart, /data-aging-preview/);
  assert.match(chart, /min-h-\[4\.5rem\][\s\S]*border/);
  assert.doesNotMatch(chart, /return <Link[\s\S]*?href=\{item\.href\}/);
  assert.match(chart, /Select a bucket to filter invoice detail/);
  assert.match(chart, /Preview a bucket to see its balance and invoice count/);
  assert.doesNotMatch(chart, /Hover, tap, or focus a bucket/);
});
