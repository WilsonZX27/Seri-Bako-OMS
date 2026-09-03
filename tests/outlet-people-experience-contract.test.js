const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

test("Outlet Management and People list workspaces use the shared wide canvas", () => {
  for (const route of [
    "src/app/(app)/people/page.tsx",
    "src/app/(app)/outlet-compliance/page.tsx",
    "src/app/(app)/outlet-calendar/page.tsx",
  ]) {
    const page = read(route);
    assert.match(page, /contentWidth="wide"/);
    assert.match(page, /tabletCanvas="wide"/);
  }
  const dailyRecords = read("src/app/(app)/outlet-daily-records/page.tsx");
  assert.match(dailyRecords, /contentWidth="wide"/);
  assert.match(dailyRecords, /<WorkspaceGrid className="sb-portrait-tablet-rail"/);
});

test("employee detail does not reload the full directory", () => {
  const page = read("src/app/(app)/people/[id]/page.tsx");
  const queries = read("src/server/queries/foundation.ts");
  assert.match(page, /getStaffProfileSummary\(id\)/);
  assert.doesNotMatch(page, /getStaffs\(/);
  assert.match(queries, /export async function getStaffProfileSummary/);
  assert.match(queries, /\.eq\("staff_id", staffId\)/);
});

test("employee summary uses the same account-state authority as each row", () => {
  const page = read("src/app/(app)/people/page.tsx");
  assert.match(page, /Summary label="Setup pending" value=\{staffs\.filter\(\(staff\)=>getStaffAuthState\(staff\)==="setup_pending"\)\.length\}/);
  assert.doesNotMatch(page, /invitation_status\?\?staff\.status/);
});

test("outlet checklist detail scopes its records before rendering", () => {
  const detail = read("src/app/(app)/outlet-compliance/[branchId]/page.tsx");
  const queries = read("src/server/queries/compliance.ts");
  assert.match(detail, /getOutletComplianceWorkspace\(branchId\)/);
  assert.match(queries, /recordsQuery = recordsQuery\.eq\("branch_id", branchId\)/);
  assert.match(queries, /requirementsQuery = requirementsQuery\.eq\("branch_id", branchId\)/);
});

test("People, Attendance and Compliance expose route loading feedback", () => {
  for (const route of [
    "src/app/(app)/people/loading.tsx",
    "src/app/(app)/attendance/loading.tsx",
    "src/app/(app)/outlet-compliance/loading.tsx",
    "src/app/(app)/outlet-calendar/loading.tsx",
    "src/app/(app)/outlet-daily-records/loading.tsx",
  ]) {
    assert.match(read(route), /PageLoadingState/);
  }
});
