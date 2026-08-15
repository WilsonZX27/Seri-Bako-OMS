const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const workspace = fs.readFileSync("src/components/dashboard-workspace.tsx", "utf8");
const roleMatrix = fs.readFileSync("tests/e2e/dashboard-role-awareness-7-23-2.spec.js", "utf8");
const workspaceSidebar = fs.readFileSync("src/components/layout/workspace-sidebar.tsx", "utf8");

test("Dashboard distinguishes a clear queue from unavailable domain data", () => {
  assert.match(workspace, /You’re clear—no approvals or workflow actions are waiting/);
  assert.match(workspace, /Payables attention is temporarily unavailable/);
  assert.match(workspace, /All current supplier invoices are up to date/);
  assert.match(workspace, /Some queues are unavailable/);
  assert.match(workspace, /Unavailable:/);
});

test("Dashboard keeps ordinary navigation labels in sentence case at readable compact size", () => {
  assert.match(workspace, /text-\[11px\] font-medium text-\[var\(--sb-text-muted\)\]">Welcome/);
  assert.doesNotMatch(workspace, />WELCOME</);
  assert.doesNotMatch(workspace, /Quick actions-title" className="[^"]*uppercase/);
});

test("Dashboard keeps attention composition separate from operational activity", () => {
  const pulse = workspace.match(/<section data-dashboard-command[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(workspace, /label: "Pending approvals"/);
  assert.match(workspace, /label: "Low stock"/);
  assert.match(workspace, /label: "Stock count due"/);
  assert.match(workspace, /label: "Wastage review"/);
  assert.match(workspace, /label: "Overdue payables"/);
  assert.doesNotMatch(pulse, />Receiving</);
  assert.doesNotMatch(pulse, />Recent requests</);
});

test("Dashboard visual evidence includes forced partial-data and long-label stress states", () => {
  assert.match(workspace, /data-dashboard-attention-summary/);
  assert.match(workspace, /data-dashboard-attention-value/);
  assert.match(workspace, /No urgent exceptions/);
  assert.match(workspace, /data-dashboard-user-name/);
  assert.match(workspace, /data-dashboard-role-label/);
  assert.match(workspace, /data-dashboard-scope-label/);
  assert.match(roleMatrix, /partial-data and long-label visual stress states/);
  assert.match(roleMatrix, /Unavailable: payables, wastage/);
  assert.match(roleMatrix, /stress dashboard must not overflow/);
  assert.match(roleMatrix, /7-stress-partial-long-label-/);
});

test("company logo intrinsic dimensions cannot widen the responsive app shell", () => {
  assert.match(workspaceSidebar, /width=\{32\} height=\{32\}/);
  assert.match(workspaceSidebar, /max-h-8 max-w-8 object-contain/);
});
