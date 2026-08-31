const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const dashboard = fs.readFileSync(path.join(root, "src", "components", "dashboard-workspace.tsx"), "utf8");
const purchaseRequests = fs.readFileSync(path.join(root, "src", "app", "(app)", "purchase-requests", "page.tsx"), "utf8");
const stockCounts = fs.readFileSync(path.join(root, "src", "app", "(app)", "stock-counts", "page.tsx"), "utf8");
const planning = fs.readFileSync(path.join(root, "src", "app", "(app)", "production", "planning", "page.tsx"), "utf8");
const css = `${fs.readFileSync(path.join(root, "src", "app", "globals.css"), "utf8")}\n${fs.readFileSync(path.join(root, "src", "app", "design-system-v2.css"), "utf8")}`;

test("dashboard uses one non-duplicated operational hierarchy", () => {
  assert.doesNotMatch(dashboard, /Signal mix|Live summary/);
  assert.match(dashboard, /data-dashboard-identity/);
  assert.match(dashboard, /data-dashboard-quick-actions/);
  assert.match(dashboard, /data-dashboard-pulse-metrics/);
  assert.match(dashboard, /data-dashboard-exceptions/);
  assert.match(dashboard, /data-dashboard-payables/);
});

test("priority dashboard groups remain compact across phone and tablet", () => {
  assert.match(dashboard, /grid grid-cols-3 divide-x divide-\[var\(--sb-border-soft\)\][^\n]*data-dashboard-quick-actions/);
  assert.doesNotMatch(dashboard, /data-dashboard-quick-actions[\s\S]{0,900}hover:-translate-y/);
  assert.match(dashboard, /grid grid-cols-3 divide-x divide-\[var\(--sb-border-soft\)\][^\n]*data-dashboard-exceptions/);
  assert.match(dashboard, /grid grid-cols-3 divide-x divide-\[var\(--sb-border-soft\)\][^\n]*data-dashboard-payables/);
});

test("purchase requests and stock counts share canonical query-card ownership", () => {
  assert.equal((purchaseRequests.match(/<FilterBar\s/g) ?? []).length, 1);
  assert.doesNotMatch(purchaseRequests, /UnifiedListHeader|hidden sm:block[\s\S]*sm:hidden/);
  assert.doesNotMatch(purchaseRequests, /sb-tablet-split-filter/);
  assert.doesNotMatch(stockCounts, /sb-tablet-split-filter/);
  assert.equal((stockCounts.match(/<FilterBar\s/g) ?? []).length, 1);
  assert.doesNotMatch(stockCounts, /UnifiedListHeader|hidden sm:block[\s\S]*sm:hidden/);
  assert.match(css, /\.sb-list-query-card/);
});

test("dashboard secondary column keeps exceptions ahead of routine activity", () => {
  assert.match(dashboard, /flex flex-col gap-4 lg:col-span-6" data-dashboard-secondary-column/);
  assert.match(dashboard, /className="order-1" data-dashboard-priority-group="exceptions"/);
  assert.match(dashboard, /className="order-2 space-y-4" data-dashboard-activity-group/);
  assert.match(dashboard, /className="order-3" data-dashboard-priority-group="payables"/);
  assert.doesNotMatch(dashboard, /className="order-4"/);
  assert.doesNotMatch(dashboard, /rightRail=\{isOutlet \? undefined/);
});

test("production planning keeps the query surface flat and balanced", () => {
  assert.match(planning, /<FilterBar resetHref="\/production\/planning" className="sb-list-filters--balanced">/);
  assert.doesNotMatch(planning, /<div className="overflow-hidden border bg-card"><FilterBar/);
  assert.match(planning, /aria-label="Planning period"/);
  assert.match(planning, /aria-label="Planning outlet"/);
  assert.match(planning, /aria-label="Target days"/);
});

test("stock count tablet rail has an explicit card contract", () => {
  assert.match(stockCounts, /data-stock-count-tablet-rail/);
  assert.match(stockCounts, /shadow-\[var\(--sb-shadow-card\)\]/);
  assert.match(css, /\[data-stock-count-tablet-rail\] > section/);
});

test("stock count register defaults to descending document sequence and shows the active sort", () => {
  const query = fs.readFileSync(path.join(root, "src", "server", "queries", "stock-counts.ts"), "utf8");
  assert.match(query, /requestedSort[\s\S]*: "count_no"/);
  assert.match(query, /requestedSort === "count_no" \? "created_at"/);
  assert.match(stockCounts, /currentSort=\{filters\.sort \?\? "count_no"\}/);
  assert.match(stockCounts, /currentDir=\{filters\.dir \?\? "desc"\}/);
});
