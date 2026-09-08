const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (...parts) => fs.readFileSync(path.join(process.cwd(), ...parts), "utf8");

test("dashboard and attendance workspaces follow the corrected visual hierarchy", () => {
  assert.doesNotMatch(read("src", "components", "dashboard-workspace.tsx"), /Queue load|QueueLoadChart/);
  const navigation = read("src", "components", "attendance", "attendance-workspace-nav.tsx");
  assert.match(navigation, /bg-\[var\(--sb-green-100\)\]/);
  assert.doesNotMatch(navigation, /border-b-2/);
  const planner = read("src", "components", "attendance", "schedule-planner.tsx");
  assert.match(planner, /editableStatus[\s\S]*?Save draft[\s\S]*?Submit to Manager/);
  assert.match(planner, /week\?\.status==="submitted"/);
  assert.match(read("src", "app", "globals.css"), /dialog\.m-auto\[open\][\s\S]*position: fixed;[\s\S]*inset: 0;/);
  assert.match(read("src", "app", "(app)", "attendance", "schedule", "loading.tsx"), /PageLoadingState/);
});

test("calendar, settings, review and imports expose direct context instead of hidden steps", () => {
  assert.match(read("src", "app", "(app)", "outlet-calendar", "page.tsx"), /rightRail=\{rightRail\}/);
  assert.match(read("src", "app", "(app)", "attendance", "settings", "page.tsx"), /rightRail=\{rightRail\}/);
  const review = read("src", "app", "(app)", "attendance", "review", "page.tsx");
  assert.match(review, /Actual attendance filters/);
  assert.match(review, /All accessible outlets/);
  const mappings = read("src", "components", "attendance", "mapping-admin.tsx");
  assert.doesNotMatch(mappings, /NGTeco Person ID[\s\S]*OMS employee/);
  assert.match(mappings, /NGTeco Source[\s\S]*Outlet/);
  const workflow = read("src", "components", "attendance", "attendance-import-workflow.tsx");
  assert.match(workflow, /employees matched automatically/);
  assert.match(workflow, /md:items-start/);
  assert.doesNotMatch(workflow, /Choose an NGTeco CSV or XLSX file\. Preview never writes to the database\./);
});

test("daily records, receiving, compliance and stock count feedback remains explicit and recoverable", () => {
  const dailyForm = read("src", "components", "outlet-daily-record-form.tsx");
  assert.match(dailyForm, /Difference reason \(optional\)/);
  assert.doesNotMatch(dailyForm, /required=\{hasPosTotal && difference !== 0\}/);
  assert.match(read("src", "app", "(app)", "goods-receivings", "page.tsx"), /className="min-w-36"/);
  const compliance = read("src", "server", "actions", "compliance.ts");
  assert.match(compliance, /export async function revokeComplianceRecord/);
  assert.match(compliance, /This evidence is no longer pending review/);
  const outletCompliance = read("src", "app", "(app)", "outlet-compliance", "[branchId]", "page.tsx");
  assert.match(outletCompliance, /ComplianceAttachmentUpload/);
  assert.doesNotMatch(outletCompliance, /Replace document/);
  assert.match(outletCompliance, /AttachmentRemoveAction/);
  assert.doesNotMatch(outletCompliance, /reviewComplianceRecord|>Approve<|>Return<|Pending review|Submit for review/);
  assert.match(read("src", "app", "(app)", "outlet-compliance", "page.tsx"), /New requirement/);
  assert.match(read("src", "server", "queries", "topbar.ts"), /"purchasing", "manager", "finance", "people_operations", "super_admin"/);
  const countForm = read("src", "components", "stock-count-form.tsx");
  assert.match(countForm, /disabled=\{!itemCatalog\.length \|\| !countComplete\}/);
  const countDetail = read("src", "app", "(app)", "stock-counts", "[id]", "page.tsx");
  assert.match(countDetail, /Retired lines/);
  assert.match(countDetail, /Retired by this Stock Count/);
});
