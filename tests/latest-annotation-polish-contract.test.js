const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("purchase request lines use one responsive control geometry and no duplicate detail save rail", () => {
  const form = read("src", "components", "procurement-forms.tsx");
  const detail = read("src", "app", "(app)", "purchase-requests", "[id]", "page.tsx");
  assert.match(form, /reserveMobileActionSpace = true/);
  assert.match(form, /space-y-2 lg:col-span-1/);
  assert.match(form, /grid-cols-\[1\.75rem_minmax\(7rem,1\.15fr\)_minmax\(7rem,1fr\)_2\.75rem\]/);
  assert.match(form, /grid-cols-\[minmax\(14rem,1fr\)_10rem_8\.5rem_2\.75rem_2\.75rem\]/);
  assert.match(form, /data-pr-line-supplier/);
  assert.match(form, /className="flex justify-end border-t/);
  assert.doesNotMatch(form, /data-purchase-request-line[^\n]+md:grid-cols/);
  assert.match(form, /h-\[var\(--sb-control-height\)\][\s\S]*w-10/);
  const design = read("src", "app", "design-system-v2.css");
  assert.match(design, /#purchase-request-form \[data-purchase-request-line\] :where\(input, select, button\)[\s\S]*height: var\(--sb-control-height\) !important/);
  assert.doesNotMatch(design, /data-purchase-request-line\] \{[\s\S]*grid-template-columns/);
  assert.match(design, /sb-list-filters--equal-controls > \.sb-filter-more > summary[\s\S]*width: 100% !important/);
  assert.match(detail, /saveDraftAction/);
  assert.match(detail, /saveDraftAction \|\| canCancel \|\| canReject \|\| deleteControl/);
  assert.match(detail, /reserveMobileActionSpace=\{false\}/);
  assert.doesNotMatch(detail, /<div className="mt-4">\s*<SubmitButton form="purchase-request-form"/);
});

test("mobile shell and loading states avoid warm bands, layout shifts, and duplicate status copy", () => {
  const topBar = read("src", "components", "layout", "top-bar.tsx");
  const layout = read("src", "app", "layout.tsx");
  const globals = read("src", "app", "globals.css");
  const outlet = read("src", "app", "(app)", "outlet-daily-records", "page.tsx");
  const stockLoading = read("src", "app", "(app)", "stock-counts", "new", "loading.tsx");
  assert.match(topBar, /sticky top-0 z-40/);
  assert.match(topBar, /bg-white/);
  assert.match(layout, /themeColor: "#ffffff"/);
  assert.match(globals, /--background: 150 12% 94%/);
  assert.doesNotMatch(outlet, /Posted · editable/);
  assert.match(stockLoading, /LoaderCircle/);
  assert.match(stockLoading, /animate-spin/);
  assert.doesNotMatch(stockLoading, /animate-pulse/);
});

test("supplier item results keep a raised table surface, ten-pixel headers, and semantic column widths", () => {
  const page = read("src", "app", "(app)", "supplier-items", "page.tsx");
  const design = read("src", "app", "design-system-v2.css");
  const table = read("src", "components", "ui", "table.tsx");
  assert.match(page, /className="sb-list-content-card overflow-hidden"/);
  assert.match(page, /className="sb-supplier-items-table"/);
  assert.match(table, /data-ui-table="true"/);
  assert.match(design, /table\[data-ui-table\] > thead > tr > th[\s\S]*font-size: \.625rem/);
  assert.match(design, /thead th \{[\s\S]*font-size: 0\.625rem/);
  assert.match(design, /\.sb-supplier-items-table \{[\s\S]*table-layout: fixed/);
  assert.match(design, /\.sb-supplier-items-table :is\(th, td\):nth-child\(3\) \{ width: 18rem; \}/);
  assert.match(page, />Purchasing Terms</);
  assert.doesNotMatch(page, /<SortableHead label="Supplier Code"/);
  assert.match(design, /> \.sb-table-region \{[\s\S]*background: var\(--sb-surface-raised\)/);
});

test("August 19 annotation closure groups PR data, simplifies loading, and standardizes outlet analytics", () => {
  const requests = read("src", "app", "(app)", "purchase-requests", "page.tsx");
  const pagination = read("src", "components", "sortable-table.tsx");
  const loading = read("src", "components", "ui", "system-states.tsx");
  const matrix = read("src", "components", "outlet-daily-completion-matrix.tsx");
  const chart = read("src", "components", "outlet-daily-wastage-chart.tsx");
  const production = read("src", "app", "(app)", "production", "jobs", "page.tsx");
  const design = read("src", "app", "design-system-v2.css");

  assert.match(requests, /label="Schedule" column="request_date"/);
  assert.match(requests, />Request context</);
  assert.match(requests, />Request value</);
  assert.match(requests, /BulkSelectRowCheckbox[\s\S]*TableActionLink[\s\S]*DocumentNumber/);
  assert.match(pagination, /aria-label="Go to page"/);
  assert.match(pagination, /type="number"[\s\S]*max=\{totalPages\}/);
  assert.match(loading, /data-page-loading-state/);
  assert.doesNotMatch(loading, /\[0, 1, 2, 3\]\.map/);
  assert.doesNotMatch(matrix, /Scroll horizontally to view all days/);
  assert.doesNotMatch(chart, /Hover or focus the chart/);
  assert.match(chart, /xl:grid-cols-\[minmax\(0,3fr\)_minmax\(18rem,2fr\)\]/);
  assert.match(production, /className="sb-portrait-tablet-rail"/);
  assert.match(design, /\[data-tablet-document-split\]\[data-tablet-rail-breakpoint="md"\][\s\S]*> aside[\s\S]*display: block/);
  assert.match(design, /\.sb-purchase-request-table :is\(th, td\):nth-child\(7\) \{ width: 10rem; \}/);
});

test("production follow-up keeps PR review compact and low stock semantically critical", () => {
  const detail = read("src", "app", "(app)", "purchase-requests", "[id]", "page.tsx");
  const recovery = read("src", "components", "purchase-request-line-recovery.tsx");
  const actions = read("src", "server", "actions", "procurement.ts");
  const dashboard = read("src", "components", "dashboard-workspace.tsx");
  assert.match(detail, />Qty \/ UOM</);
  assert.match(detail, /formatNumber\(line\.qty\)\} \{line\.uom\}/);
  assert.doesNotMatch(detail, /<TableHead className="text-right">Qty<\/TableHead>/);
  assert.match(recovery, /w-\[min\(60rem,calc\(100vw-2rem\)\)\]/);
  assert.match(actions, /expectedUpdatedAt: z\.string\(\)\.datetime\(\{ offset: true \}\)/);
  assert.match(dashboard, /label="Low stock"[\s\S]*alertTone="critical"/);
});

test("current annotation batch keeps shared explanation and responsive filter ownership", () => {
  const detail = read("src", "app", "(app)", "purchase-requests", "[id]", "page.tsx");
  const form = read("src", "components", "procurement-forms.tsx");
  const production = read("src", "app", "(app)", "production", "jobs", "page.tsx");
  const stockCounts = read("src", "app", "(app)", "stock-counts", "page.tsx");
  const design = read("src", "app", "design-system-v2.css");
  assert.match(detail, /requestedItemCount/);
  assert.match(detail, /text-\[var\(--sb-danger\)\]/);
  assert.match(form, /Supplier mapping required/);
  assert.match(form, /No active supplier route uses/);
  assert.match(production, /tabletCanvas="contained"/);
  assert.match(stockCounts, /sb-list-filters--portrait-query/);
  assert.match(design, /sb-list-filters--portrait-query\[data-tablet-query-layout="query"\]/);
  assert.match(design, /--sb-control-height: 2\.25rem/);
});
