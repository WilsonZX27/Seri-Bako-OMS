const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

test("People and Staff keep section actions beside their titles", () => {
  const section = read("src/components/record-workspace.tsx");
  const permissions = read("src/components/staff-permission-overrides.tsx");
  const people = read("src/app/(app)/people/[id]/page.tsx");
  const staff = read("src/app/(app)/staffs/[id]/page.tsx");

  assert.match(section, /action\?: ReactNode/);
  assert.match(section, /CardHeader className="flex-row items-start justify-between/);
  assert.match(permissions, /action=\{[\s\S]*canManage[\s\S]*form="staff-permissions-form"/);
  assert.match(people, /md:grid-cols-2/);
  assert.match(people, /form="protected-payroll-form"/);
  assert.match(people, /form="staff-compliance-record-form"/);
  assert.ok(staff.indexOf("Save Staff") < staff.indexOf("Open profile"));
});

test("mobile scheduling retains bounded, aligned and state-specific actions", () => {
  const planner = read("src/components/attendance/schedule-planner.tsx");
  const css = read("src/app/design-system-v2.css");

  assert.match(planner, /grid-cols-\[auto_minmax\(0,1fr\)_7\.5rem\]/);
  assert.match(planner, /editableStatus && canDraft && !managerEditing/);
  assert.match(planner, /editableStatus && canSubmit && !managerEditing/);
  assert.match(planner, /templateColours/);
  assert.match(planner, /color-mix\(in srgb/);
  assert.match(planner, /href=\{`\/people\/\$\{person\.id\}`\}/);
  assert.match(css, /\.sb-schedule-workspace[\s\S]*padding-inline: 1rem !important/);
  assert.match(css, /href="\/attendance\/settings"[\s\S]*padding-bottom/);
  assert.match(css, /details\[open\] \[data-template-mobile-actions\][\s\S]*\[data-mobile-bottom-nav\]/);
  assert.doesNotMatch(css, /html:has\(\[data-template-mobile-actions\]\) \[data-mobile-bottom-nav\]/);
  assert.doesNotMatch(css, /\[data-schedule-planner\][^{]*\{\s*margin-inline:\s*-1rem/);
  assert.match(css, /\[data-schedule-mobile-actions\][\s\S]*inset: auto 1rem/);
});

test("schedule working-time tools expose quick states and a paid-hours summary", () => {
  const planner = read("src/components/attendance/schedule-planner.tsx");

  assert.match(planner, /Paid time summary/);
  assert.match(planner, /Quick non-working assignment/);
  assert.match(planner, /aria-labelledby="schedule-working-time-title"/);
  for (const state of ['label: "OFF"', 'label: "AL"', 'label: "PH"', 'label: "UPL"']) {
    assert.ok(planner.includes(state));
  }
});

test("warning and empty-state feedback follows the annotated hierarchy", () => {
  const dashboard = read("src/components/dashboard-workspace.tsx");
  const review = read("src/app/(app)/attendance/review/page.tsx");

  assert.match(dashboard, /pendingApprovals\.length \? "danger" : "default"/);
  assert.doesNotMatch(review, /Attendance records stay unloaded until you choose an outlet above/);
  assert.match(review, /block whitespace-nowrap text-\[10px\] text-amber-800/);
  assert.match(review, /<dd className="whitespace-nowrap text-\[10px\] text-amber-800">/);
  assert.match(review, /grid min-w-32 grid-cols-1 gap-1/);
});
