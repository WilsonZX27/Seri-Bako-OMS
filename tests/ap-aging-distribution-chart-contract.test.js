const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src/app/(app)/supplier-invoices/aging/page.tsx"), "utf8");
const chart = fs.readFileSync(path.join(root, "src/components/reports/aging-distribution-bars.tsx"), "utf8");

test("AP Aging renders ordered direct-label distribution bars from the report buckets", () => {
  assert.match(page, /<AgingDistributionBars items=\{agingDistribution\}/);
  assert.match(page, /outstanding: report\.buckets\[key\]\?\.outstanding \?\? 0/);
  assert.match(page, /invoiceCount: report\.buckets\[key\]\?\.invoice_count \?\? 0/);
  assert.match(chart, /Outstanding by aging bucket/);
  assert.match(chart, /formatCurrency\(item\.outstanding\)/);
  assert.match(chart, /item\.invoiceCount/);
});

test("Every aging bar preserves current filters and drills into the same invoice table", () => {
  assert.match(page, /params\.set\("bucket", bucket\)/);
  assert.match(page, /params\.delete\("page"\)/);
  assert.match(chart, /href=\{item\.href\}/);
  assert.match(chart, /onMouseEnter/);
  assert.match(chart, /onFocus/);
  assert.match(chart, /role="tooltip"/);
  assert.match(chart, /Select a bucket to filter invoice detail/);
});
