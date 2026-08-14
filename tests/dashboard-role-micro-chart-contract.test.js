const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");
const workspace = read("src/components/dashboard-workspace.tsx");
const chart = read("src/components/dashboard-role-micro-chart.tsx");
const roleChartBlock = workspace.match(/const roleChartItems:[\s\S]*?\n\s*const quickActions/)?.[0] ?? "";

test("Dashboard adds at most one bounded role comparison and excludes Outlet Staff", () => {
  assert.equal((workspace.match(/<DashboardRoleMicroChart/g) ?? []).length, 1);
  assert.match(workspace, /\{isOutlet \? \(/);
  assert.match(workspace, /<DashboardRoleMicroChart[\s\S]*?<QuickActionsCluster/);
  assert.match(roleChartBlock, /isFinance[\s\S]*isKitchen[\s\S]*isPurchasing/);
  assert.doesNotMatch(roleChartBlock, /purchaseOrders\.length|urgentRequests\.length/);
});

test("Dashboard role comparison preserves unavailable state and exact interaction", () => {
  assert.match(chart, /value: number \| null/);
  assert.match(chart, /item\.value === null \? "Unavailable"/);
  assert.match(chart, /Current request-time snapshot · record and item counts only/);
  assert.match(chart, /onMouseEnter/);
  assert.match(chart, /onFocus/);
  assert.match(chart, /onClick/);
  assert.match(chart, /data-dashboard-role-chart-preview aria-live="polite"/);
  assert.match(chart, /href=\{active\.href\}/);
});

test("Dashboard role comparison uses stable severity order and explicit trust states", () => {
  assert.match(chart, /const tonePriority = \{ critical: 0, warning: 1, active: 2, neutral: 3 \}/);
  assert.match(chart, /const orderedItems = useMemo/);
  assert.match(chart, /tonePriority\[left\.tone \?\? "neutral"\] - tonePriority\[right\.tone \?\? "neutral"\]/);
  assert.match(chart, /active\?\.value === null \? "Unavailable" : active\?\.value === 0 \? "Clear"/);
  assert.match(chart, /data-dashboard-signal-priority/);
});

test("Finance-only payables fields stay out of non-finance role branches", () => {
  const financeBranch = roleChartBlock.match(/isFinance([\s\S]*?): isKitchen/)?.[1] ?? "";
  const kitchenBranch = roleChartBlock.match(/: isKitchen([\s\S]*?): isPurchasing/)?.[1] ?? "";
  const purchasingBranch = roleChartBlock.match(/: isPurchasing([\s\S]*?): \[/)?.[1] ?? "";
  assert.match(financeBranch, /payablesAttention/);
  assert.doesNotMatch(kitchenBranch, /payablesAttention|supplier-invoices/);
  assert.doesNotMatch(purchasingBranch, /payablesAttention|supplier-invoices/);
});
