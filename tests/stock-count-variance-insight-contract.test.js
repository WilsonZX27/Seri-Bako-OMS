const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("Stock Count variance insight is posted-only, tolerance-authoritative and unit-safe", () => {
  const sql = read("supabase/migrations/149_stock_count_variance_insight.sql");
  assert.match(sql, /sc\.status = 'posted'/);
  assert.match(sql, /abs\(scl\.variance_percent\) > sc\.tolerance_percent/);
  assert.match(sql, /report_date - 29/);
  assert.match(sql, /count\(h\.count_id\).*variance_qty < 0/s);
  assert.match(sql, /count\(h\.count_id\).*variance_qty > 0/s);
  assert.doesNotMatch(sql, /sum\([^)]*variance_qty/);
  assert.match(sql, /where r\.rank_order <= 8/g);
  assert.match(sql, /security invoker/);
});

test("Stock Count fallback uses each count's saved tolerance", () => {
  const query = read("src/server/queries/stock-counts.ts");
  assert.match(query, /select\("id,count_no,count_date,posted_at,branch_id,tolerance_percent"\)/);
  assert.match(query, /Math\.abs\(Number\(line\.variance_percent \?\? 0\)\) <= Number\(count\.tolerance_percent \?\? 0\)/);
  assert.match(query, /from\("stock_counts"\)/);
  assert.match(query, /from\("stock_count_lines"\)/);
  assert.match(query, /posted.*deleted_at/s);
  assert.match(query, /available: false/);
});

test("Stock Count insight provides compact views, exact previews, drill-through and unavailable state", () => {
  const component = read("src/components/reports/stock-count-variance-insights.tsx");
  const ranking = read("src/components/ui/interactive-ranking-chart.tsx");
  const page = read("src/app/(app)/stock-counts/page.tsx");
  for (const label of ["Daily trend", "Repeat items", "Branches"]) assert.match(component, new RegExp(label));
  assert.match(component, /InteractiveLineChart/);
  assert.match(component, /InteractiveRankingChart/);
  assert.match(ranking, /data-ranking-open/);
  assert.match(ranking, /aria-pressed/);
  assert.match(component, /latest_variance_percent/);
  assert.match(component, /latest_variance_qty/);
  assert.match(component, /Variance insight unavailable/);
  assert.match(component, /no unavailable result is shown as zero/);
  assert.match(component, /stock-counts\?status=posted&from=/);
  assert.match(component, /data-stock-count-variance-daily-list/);
  assert.match(component, /role="list" aria-label="Daily above-tolerance Stock Count variance"/);
  assert.match(component, /max-h-80 divide-y/);
  assert.doesNotMatch(component, /min-w-\[25rem\]|overflow-x-auto/);
  assert.match(ranking, /activeItem\.href \?/);
  assert.match(page, /<StockCountVarianceInsights insight=\{varianceInsight\}/);
  assert.ok(page.indexOf("<FilterBar") < page.indexOf("<StockCountVarianceInsights"));
  assert.ok(page.indexOf("<PaginationControls") < page.indexOf("<StockCountVarianceInsights"));
});

test("Stock Count insight tabs preserve semantic inverse contrast", () => {
  const component = read("src/components/reports/stock-count-variance-insights.tsx");
  assert.match(component, /bg-\[var\(--sb-green-900\)\] text-\[var\(--sb-text-inverse\)\]/);
  assert.match(component, /min-h-11[\s\S]*xl:min-h-9/);
  assert.doesNotMatch(component, /bg-white|text-white|border-white/);
});
