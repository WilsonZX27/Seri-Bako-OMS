const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const dashboard = fs.readFileSync(path.join(root, "src", "components", "dashboard-workspace.tsx"), "utf8");
const mobileHeader = fs.readFileSync(path.join(root, "src", "components", "layout", "mobile-context-header.tsx"), "utf8");

test("dashboard phone top bar uses one centered Today title", () => {
  assert.match(mobileHeader, /pathname === "\/dashboard"[\s\S]*?title: "Today", backHref: null/);
  assert.match(dashboard, /<header className="hidden[\s\S]*?md:flex/);
  assert.match(dashboard, /Welcome, \{summary\.userName\}/);
  assert.match(dashboard, /summary\.roleLabel[\s\S]*?summary\.branchLabel/);
});

test("dashboard identifies every signed-in worker and their actual branch scope", () => {
  const dashboardQuery = fs.readFileSync(path.join(root, "src", "server", "queries", "dashboard.ts"), "utf8");

  assert.match(dashboard, /workspaceContext/);
  assert.match(dashboardQuery, /select\("full_name"\)/);
  assert.match(dashboardQuery, /from\("branches"\)\.select\("branch_name"\)/);
  assert.match(dashboardQuery, /branchLabel:/);
});

test("dashboard role quick actions retain role-specific destinations", () => {
  for (const role of ["isOutlet", "isKitchen", "isPurchasing", "isFinance", "isManager"]) {
    assert.match(dashboard, new RegExp(role));
  }
  assert.match(dashboard, /actions\.slice\(0, 3\)\.map/);
});

test("dashboard quick actions use the shared phone shape and safe area", () => {
  assert.match(dashboard, /rounded-\[var\(--sb-radius-panel\)\]/);
  assert.match(dashboard, /rounded-\[var\(--sb-radius-control\)\]/);
  assert.match(dashboard, /pb-24[\s\S]*?md:pb-4/);
});
