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
  assert.match(pending, /select\("id, request_no, branch_id, status, updated_at, branches\(branch_name\)", \{ count: "exact" \}\)/);
  assert.match(pending, /total: unavailable \? null : results\.reduce\(\(sum, result\) => sum \+ \(result\.count \?\? 0\), 0\)/);
  assert.match(pending, /items[\s\S]*\.slice\(0, limit\)/);
  assert.match(dashboard, /getCurrentUserPendingActionSnapshot\(5\)/);
  assert.match(dashboard, /pendingApprovals: pendingApprovals\.total \?\? 0/);
  assert.match(dashboard, /pendingApprovalsUnavailable: pendingApprovals\.unavailable/);
  assert.match(dashboard, /pendingApprovals: pendingApprovals\.items/);
});

test("Operational Pulse renders the same sources used by its total", () => {
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
  assert.match(pulse, /aria-label="Attention total breakdown"/);
  assert.match(pulse, /attentionSignals\.map/);
  assert.doesNotMatch(pulse, />Receiving</);
  assert.doesNotMatch(pulse, />Recent requests</);
});

test("Operational Pulse stays compact and avoids duplicate owner-manager charts", () => {
  const dashboard = read("src/components/dashboard-workspace.tsx");

  assert.match(dashboard, /grid grid-cols-2[\s\S]*showFinance \? "sm:grid-cols-5" : "sm:grid-cols-4"/);
  assert.match(dashboard, /min-h-12 min-w-0 items-center/);
  assert.match(dashboard, /col-span-2 sm:col-span-1/);
  assert.match(dashboard, /!isOwner && !isManager \? <DashboardRoleMicroChart/);
  assert.match(dashboard, /focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/);
});
