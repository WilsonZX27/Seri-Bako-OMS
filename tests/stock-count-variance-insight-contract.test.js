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
  assert.match(query, /toleranceByCount/);
  assert.match(query, /Math\.abs\(Number\(line\.variance_percent \?\? 0\)\) > \(toleranceByCount\.get\(stockCountId\) \?\? 0\)/);
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
  assert.match(ranking, /activeItem\.href \?/);
  assert.match(page, /<StockCountVarianceInsights insight=\{varianceInsight\}/);
});

test("Stock Count insight tabs preserve semantic inverse contrast", () => {
  const component = read("src/components/reports/stock-count-variance-insights.tsx");
  assert.match(component, /bg-\[var\(--sb-green-900\)\] text-\[var\(--sb-text-inverse\)\]/);
  assert.doesNotMatch(component, /bg-white|text-white|border-white/);
});
