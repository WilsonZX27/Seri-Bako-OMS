const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");
const workspace = read("src/components/dashboard-workspace.tsx");
const chart = read("src/components/dashboard-role-micro-chart.tsx");

test("Dashboard does not render a duplicate role snapshot until a unique trend source exists", () => {
  assert.equal((workspace.match(/<DashboardRoleMicroChart/g) ?? []).length, 0);
  assert.doesNotMatch(workspace, /roleChartItems/);
  assert.match(workspace, /\{isOutlet \? \(/);
  assert.match(workspace, /<QuickActionsCluster/);
});

test("Dashboard role comparison preserves unavailable state and exact interaction", () => {
  assert.match(chart, /value: number \| null/);
  assert.match(chart, /item\.value === null \? "Unavailable"/);
  assert.match(chart, /Current request-time snapshot · record and item counts only/);
  assert.match(chart, /onMouseEnter/);
  assert.match(chart, /onFocus/);
  assert.match(chart, /onClick/);
  assert.match(chart, /data-dashboard-role-chart-preview aria-live="polite"/);
  assert.match(chart, /grid min-h-11 w-full[\s\S]*xl:min-h-9/);
  assert.match(chart, /href=\{active\.href\}/);
  assert.match(chart, /inline-flex min-h-11 shrink-0 items-center[\s\S]*xl:min-h-8/);
});

test("Dashboard role comparison uses stable severity order and explicit trust states", () => {
  assert.match(chart, /const tonePriority = \{ critical: 0, warning: 1, active: 2, neutral: 3 \}/);
  assert.match(chart, /const orderedItems = useMemo/);
  assert.match(chart, /tonePriority\[left\.tone \?\? "neutral"\] - tonePriority\[right\.tone \?\? "neutral"\]/);
  assert.match(chart, /active\?\.value === null \? "Unavailable" : active\?\.value === 0 \? "Clear"/);
  assert.match(chart, /data-dashboard-signal-priority/);
});

test("Role snapshot component remains available for a future unique trend surface", () => {
  assert.match(chart, /export function DashboardRoleMicroChart/);
  assert.match(chart, /Current request-time snapshot · record and item counts only/);
});
