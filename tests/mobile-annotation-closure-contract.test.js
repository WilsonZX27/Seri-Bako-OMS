const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

test("mobile document actions share one row without a double-width primary action", () => {
  const workspace = read("src/components/documents/document-workspace.tsx");
  assert.match(workspace, /filter\(Boolean\)\.length === 3[\s\S]*grid-cols-3[\s\S]*filter\(Boolean\)\.length === 2[\s\S]*grid-cols-2/);
  assert.doesNotMatch(workspace, /col-span-2[^\n]*primary/);
});

test("outlet sales entry is a compact numeric two-column form", () => {
  const form = read("src/components/outlet-daily-record-form.tsx");
  assert.match(form, /grid grid-cols-2 gap-2 p-3/);
  assert.match(form, /type="number" inputMode="decimal"/);
});

test("route loading preserves app navigation and removes stale route actions", () => {
  const design = read("src/app/design-system-v2.css");
  assert.match(design, /:has\(\[data-page-loading-state\]\)[\s\S]*\[data-mobile-action-bar\][\s\S]*display: none/);
  assert.match(design, /:has\(\[data-page-loading-state\]\) \[data-mobile-bottom-nav\][\s\S]*display: block/);
});

test("compliance upload and More Actions use compact deliberate spacing", () => {
  const attachment = read("src/components/compliance-attachment-upload.tsx");
  const page = read("src/app/(app)/outlet-compliance/[branchId]/page.tsx");
  const consoleSource = read("src/components/layout/right-console.tsx");
  for (const source of [attachment, page]) assert.match(source, /grid-cols-\[minmax\(0,7fr\)_minmax\(6\.5rem,3fr\)\]/);
  assert.match(consoleSource, /data-mobile-console-content[^>]*grid[^>]*gap-3/);
});

test("attendance has a phone day planner and exposes persistent workflow actions", () => {
  const planner = read("src/components/attendance/schedule-planner.tsx");
  assert.match(planner, /<WorkspaceGrid rightRail=\{workflowActions\} hideMobileConsole/);
  assert.match(planner, /data-schedule-mobile-day/);
  assert.match(planner, /grid grid-cols-7/);
  assert.match(planner, /data-schedule-mobile-actions/);
});

test("ready outlet records enter the controlled posting queue", () => {
  const migration = read("supabase/migrations/260_outlet_daily_controlled_posting.sql");
  const pending = read("src/server/queries/pending-actions.ts");
  assert.match(migration, /outlet_daily_record\.post/);
  assert.match(migration, /p_action = 'post'/);
  assert.match(migration, /target\.status <> 'evening_completed'/);
  assert.match(pending, /hasPermission\("outlet_daily_record\.post"\)/);
  assert.match(pending, /eq\("status", "evening_completed"\)/);
  assert.match(pending, /title: "Outlet daily record ready to post"/);
});
