const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const dashboard = fs.readFileSync(path.join(root, "src", "components", "dashboard-workspace.tsx"), "utf8");
const purchaseRequests = fs.readFileSync(path.join(root, "src", "app", "(app)", "purchase-requests", "page.tsx"), "utf8");
const stockCounts = fs.readFileSync(path.join(root, "src", "app", "(app)", "stock-counts", "page.tsx"), "utf8");
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
  assert.match(dashboard, /grid grid-cols-3 gap-2[^\n]*data-dashboard-quick-actions/);
  assert.match(dashboard, /grid grid-cols-3 gap-1\.5 sm:gap-2[^\n]*data-dashboard-exceptions/);
  assert.match(dashboard, /grid grid-cols-3 gap-1\.5 sm:gap-2[^\n]*data-dashboard-payables/);
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

test("stock count tablet rail has an explicit card contract", () => {
  assert.match(stockCounts, /data-stock-count-tablet-rail/);
  assert.match(stockCounts, /shadow-\[var\(--sb-shadow-card\)\]/);
  assert.match(css, /\[data-stock-count-tablet-rail\] > section/);
});
