const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const query = fs.readFileSync("src/server/queries/procurement-variance.ts", "utf8");
const page = fs.readFileSync("src/app/(app)/reports/procurement-variance/page.tsx", "utf8");
const charts = fs.readFileSync("src/components/reports/procurement-variance-charts.tsx", "utf8");
const ranking = fs.readFileSync("src/components/ui/interactive-ranking-chart.tsx", "utf8");
const version = fs.readFileSync("src/lib/app-version.ts", "utf8");

test("procurement variance only compares existing document-line links", () => {
  assert.match(query, /goods_receiving_line_id === grnLine\.id/);
  assert.match(query, /purchase_order_line_id === line\.id/);
  assert.match(query, /Missing GRN|Missing invoice|Review manually/);
  assert.match(query, /comparison_date >= filters\.date_from/);
  assert.doesNotMatch(query, /suppliers\.company_id/);
});

test("procurement variance keeps warning calculations read-only", () => {
  assert.match(query, /actual - expected/);
  assert.match(query, /Math\.abs\(amount\) > 0\.01/);
  assert.match(query, /Math\.abs\(amount \/ expected\) > 0\.02/);
  assert.doesNotMatch(query, /\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
});

test("procurement variance route explains thresholds and release", () => {
  assert.match(page, /Thresholds are warnings, not automatic claims/);
  assert.match(page, /No PO, GRN, invoice, supplier price, or stock record is changed/);
  assert.match(version, /APP_VERSION = "\d+\.\d+\.\d+"/);
  assert.match(version, /APP_SPRINT = `v\$\{APP_VERSION\}`/);
});

test("procurement variance keeps technical detail on tablet and uses compact review rows on phones", () => {
  assert.match(page, /<MetricStrip className="grid-cols-2 sm:grid-cols-3"/);
  assert.match(page, /<FilterBarMore activeCount=/);
  assert.match(page, /<Table mobileHidden aria-label="Procurement cost variance"/);
  assert.match(page, /<OperationalList ariaLabel="Procurement cost variance"/);
  assert.match(page, /data-procurement-stage-comparison/);
  assert.match(page, /label: "PO"/);
  assert.match(page, /label: "GRN"/);
  assert.match(page, /label: "Invoice"/);
  assert.match(page, /Supplier reference:/);
  assert.match(page, /statusMeta=\{varianceSignal\(row\)\}/);
});

test("procurement variance exposes filtered concentration and absolute price rankings without changing source semantics", () => {
  assert.match(page, /<ProcurementVarianceCharts rows=\{rows\} searchParams=\{filters\} \/>/);
  assert.match(charts, /Where review work is concentrated/);
  assert.match(charts, /Largest price variances/);
  assert.match(charts, /Math\.abs\(row\.price_variance_amount/);
  assert.match(charts, /Absolute size determines rank; the displayed amount keeps its direction/);
  assert.match(charts, /current filtered scope/);
  assert.match(charts, /Math\.abs\(row\.price_variance_amount\) > 0\.01 \|\| Math\.abs\(row\.price_variance_percent \?\? 0\) > 0\.02/);
  assert.match(charts, /params\.set\("status", item\.status\.toLowerCase\(\)\.replaceAll\(" ", "_"\)\)/);
  assert.match(charts, /href: `\/reports\/procurement-variance\?\$\{params\.toString\(\)\}`/);
  assert.match(charts, /InteractiveRankingChart/);
  assert.match(ranking, /idlePrompt/);
  assert.doesNotMatch(charts, /\.insert\(|\.update\(|\.delete\(|\.rpc\(/);

  const workspace = page.indexOf("data-procurement-variance-workspace");
  const filters = page.indexOf("<FilterBar", workspace);
  const metrics = page.indexOf("<MetricStrip", workspace);
  const insights = page.indexOf("<ProcurementVarianceCharts", workspace);
  const detail = page.indexOf("<section className=\"sb-list-content-card", workspace);
  assert.ok(workspace >= 0 && filters > workspace && metrics > filters && insights > metrics && detail > insights, "Procurement Variance must keep filters, metrics, insights, and detail in one ordered workspace");
});
