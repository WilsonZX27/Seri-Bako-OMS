const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("pending actions expose an exact total separately from the five displayed records", () => {
  const pending = read("src/server/queries/pending-actions.ts");
  const dashboard = read("src/server/queries/dashboard.ts");

  assert.match(pending, /type PendingActionSnapshot = \{[\s\S]*total: number \| null;[\s\S]*unavailable: boolean/);
  assert.match(pending, /select\("id, request_no, branch_id, requested_by, status, updated_at, branches\(branch_name\)", includeTotal \? \{ count: "exact" \} : \{\}\)/);
  assert.match(pending, /order\("updated_at", \{ ascending: false \}\)/);
  assert.match(pending, /total: unavailable \|\| !includeTotal \? null : results\.reduce\(\(sum, result\) => sum \+ \(result\.count \?\? 0\), 0\)/);
  assert.match(pending, /items[\s\S]*\.slice\(0, limit\)/);
  assert.match(dashboard, /getCurrentUserPendingActionSnapshot\(5, false\)/);
  assert.match(dashboard, /pendingApprovals: pendingApprovals\.total \?\? 0/);
  assert.match(dashboard, /pendingApprovalsUnavailable: pendingApprovals\.unavailable/);
  assert.match(dashboard, /pendingApprovals: pendingApprovals\.items/);
});

test("Today's work renders only actionable queues and leaves exceptions to their owner surface", () => {
  const dashboard = read("src/components/dashboard-workspace.tsx");
  const query = read("src/server/queries/dashboard.ts");
  const pulse = dashboard.match(/<section data-dashboard-command[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(query, /sources: Record<DashboardAttentionSource, number \| null>/);
  assert.match(query, /pending_approvals: input\.pendingApprovalsUnavailable \? null : input\.pendingApprovals/);
  assert.match(query, /low_stock: input\.inventoryUnavailable \? null : input\.lowStock/);
  assert.match(query, /stock_count_due: input\.stockCountDueUnavailable \? null : input\.stockCountDue/);
  assert.match(query, /wastage: input\.wastageUnavailable \? null : input\.wastage/);
  assert.match(query, /overdue_payables: input\.payablesAttentionUnavailable \? null : input\.overduePayables/);
  assert.match(dashboard, /const attentionSignals = \[/);
  assert.match(pulse, /aria-label="Today work breakdown"/);
  assert.match(pulse, /attentionSignals\.map/);
  assert.doesNotMatch(pulse, /label: "Low stock"/);
  assert.doesNotMatch(pulse, /label: "Wastage review"/);
  assert.doesNotMatch(pulse, />Receiving</);
  assert.doesNotMatch(pulse, />Recent requests</);
});

test("Today's work stays compact without a duplicate role snapshot card", () => {
  const dashboard = read("src/components/dashboard-workspace.tsx");

  assert.match(dashboard, /grid grid-cols-2[\s\S]*attentionSignals\.length === 4 \? "sm:grid-cols-4"/);
  assert.match(dashboard, /min-h-12 min-w-0 items-center/);
  assert.match(dashboard, /col-span-2 sm:col-span-1/);
  assert.doesNotMatch(dashboard, /DashboardRoleMicroChart|roleChartItems/);
  assert.match(dashboard, /focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/);
});

test("Dashboard keeps each exception signal on its canonical owner surface", () => {
  const dashboard = read("src/components/dashboard-workspace.tsx");

  assert.match(dashboard, /data-dashboard-priority-group="exceptions"/);
  assert.match(dashboard, /data-dashboard-activity-group/);
  assert.doesNotMatch(dashboard, /Operational trend signals|Payables due-date mix|Kitchen work signals|Purchasing follow-up mix/);
});

test("pending actions expose their workflow state as a semantic status badge", () => {
  const dashboard = read("src/components/dashboard-workspace.tsx");

  assert.match(dashboard, /<StatusBadge status=\{row\.step\.toLowerCase\(\)\.replaceAll\(" ", "_"\)\}/);
  assert.doesNotMatch(dashboard, /\{row\.step\}\s*\{row\.branch_name/);
});

test("Manager and Owner dashboards include submitted outlet schedules in their action queue", () => {
  const pending = read("src/server/queries/pending-actions.ts");
  const workspace = read("src/components/dashboard-workspace.tsx");
  assert.match(pending, /permissions\["schedule\.approve"\]/);
  assert.match(pending, /from\("schedule_weeks"\)/);
  assert.match(pending, /\.eq\("status", "submitted"\)/);
  assert.match(pending, /title: "Schedule approval required"/);
  assert.match(pending, /href: `\/attendance\/schedule\?branch=/);
  assert.match(workspace, /Review and publish this outlet roster/);
});

test("Outlet Daily posting actions never inherit procurement-only supplier and amount copy", () => {
  const pending = read("src/server/queries/pending-actions.ts");
  const dashboard = read("src/components/dashboard-workspace.tsx");
  assert.match(pending, /id: `outlet-daily-\$\{row\.id\}`/);
  assert.match(dashboard, /isOutletDailyAction[\s\S]*Review outlet quantities and post to lock editing/);
  const { renderDashboard } = require("./helpers/render-workspaces.cjs");
  const html = renderDashboard("super_admin", { pendingApprovals: [{ id: "outlet-daily-fixture", document_no: "OD/001", href: "/outlet-daily-records/fixture", step: "Ready to post", supplier_names: ["POISON SUPPLIER"], estimated_total: 987654.32, line_count: 999 }] });
  const row = html.match(/<a[^>]*data-dashboard-pending-row[^>]*>[\s\S]*?<\/a>/)?.[0];
  assert.ok(row);
  assert.match(row, /Outlet Daily · OD\/001/);
  assert.match(row, /Ready to post/i);
  assert.match(row, /href="\/outlet-daily-records\/fixture"/);
  assert.doesNotMatch(row, /POISON|987|999|Supplier pending|sb-pr-phone-(supplier|items|amount)/);
});
