const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");
const workspace = read("src/components/dashboard-workspace.tsx");

test("Dashboard does not render a duplicate role snapshot until a unique trend source exists", () => {
  assert.equal((workspace.match(/<DashboardRoleMicroChart/g) ?? []).length, 0);
  assert.doesNotMatch(workspace, /roleChartItems/);
  assert.match(workspace, /\{isKitchenStaff \? \(/);
  assert.match(workspace, /<QuickActionsCluster/);
});

test("retired duplicate snapshot component is purged from the runtime source", () => {
  assert.equal(fs.existsSync("src/components/dashboard-role-micro-chart.tsx"), false);
});
