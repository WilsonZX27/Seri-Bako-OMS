const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("Production Planning keeps its tablet action rail open beside the work canvas", () => {
  const source = read("src/components/production-planning-workspace.tsx");
  assert.match(source, /rightRail=\{rail\} tabletRailMode="split" tabletRailBreakpoint="md"/);
});

test("Outlet Daily uses the annotated download label", () => {
  const source = read("src/app/(app)/outlet-daily-records/page.tsx");
  assert.match(source, /Download Record Form/);
  assert.doesNotMatch(source, /Download latest Record Form/);
});

test("repair actions show their available location and link to the specific request", () => {
  const dashboard = read("src/components/dashboard-workspace.tsx");
  const topbar = read("src/server/queries/topbar.ts");
  assert.match(dashboard, /isMaintenanceAction = row\.id\.startsWith\("maintenance-"\)/);
  assert.match(dashboard, /Repair · \$\{row\.branch_name \?\? "Location unavailable"\}/);
  assert.match(topbar, /row\.entity_type === "asset_maintenance"/);
  assert.match(topbar, /action_url: repairAction\.href/);
});
