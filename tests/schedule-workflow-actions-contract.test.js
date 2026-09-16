const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync("src/components/attendance/schedule-planner.tsx", "utf8");
const page = fs.readFileSync("src/app/(app)/attendance/schedule/page.tsx", "utf8");
const query = fs.readFileSync("src/server/queries/attendance.ts", "utf8");
const migration281 = fs.readFileSync("supabase/migrations/281_schedule_publish_recalculates_attendance.sql", "utf8");
const migration282 = fs.readFileSync("supabase/migrations/282_schedule_completeness_and_cross_outlet_projection.sql", "utf8");
const migration295 = fs.readFileSync("supabase/migrations/295_schedule_revision_replay_sequence.sql", "utf8");
const migration297 = fs.readFileSync("supabase/migrations/297_structured_cross_outlet_scheduling.sql", "utf8");
const migration302 = fs.readFileSync("supabase/migrations/302_cross_outlet_projection_provenance.sql", "utf8");

test("schedule editor and draft actions only exist in editable workflow states", () => {
  assert.match(source, /\["draft", "returned", "rejected", "amendment_pending"\]\.includes\([\s\S]*?week\.status/);
  assert.match(source, /editableStatus && canDraft/);
  assert.match(source, /disabled=\{!editableStatus \|\| !canDraft\}/);
});

test("workbook replays continue cleared assignment revision history", () => {
  assert.match(migration295, /order by revision desc limit 1 for update/);
  assert.match(migration295, /next_revision:=coalesce\(previous\.revision,0\)\+1/);
  assert.match(migration295, /previous\.id,actor/);
});

test("full-time roster days are complete and cross-outlet shifts stay canonical", () => {
  assert.match(migration282, /unresolved_staff_day/);
  assert.match(migration282, /get_schedule_external_assignments/);
  assert.match(migration282, /aw\.branch_id<>w\.branch_id/);
  assert.match(migration282, /work_site_label/);
  assert.match(migration282, /branch_type in \('outlet','central_kitchen'\)/);
  assert.doesNotMatch(source, /At \{awayLabel\}/);
  assert.match(source, /destinationBranchId/);
  assert.match(migration297, /save_schedule_week_with_destinations/);
  assert.match(migration297, /destination outlet's canonical roster/);
  assert.match(source, /tone === "external" && "border-cyan-300 bg-cyan-50 text-cyan-950"/);
  assert.match(source, /Correct published schedule/);
  assert.match(source, /Confirm & publish/);
});

test("cross-outlet projections retain source identity and retract atomically", () => {
  assert.match(migration302, /projected_from_branch_id uuid references public\.branches/);
  assert.match(migration302, /projected_from_schedule_week_id uuid references public\.schedule_weeks/);
  assert.match(migration302, /schedule_assignment_one_current_projection/);
  assert.match(migration302, /a\.projected_from_schedule_week_id=source_week\.id/);
  assert.match(migration302, /The previous destination outlet schedule is no longer editable/);
  assert.match(migration302, /event_type[\s\S]*projection_clear/);
  assert.match(migration302, /_projected_from_branch_id/);
  assert.match(migration302, /_projected_from_schedule_week_id/);
  assert.match(migration302, /previous\.projected_from_schedule_week_id/);
});

test("copy and Manager correction keep structured destination shifts", () => {
  assert.match(migration302, /create or replace function public\.copy_schedule_week/);
  assert.match(migration302, /a\.projected_from_schedule_week_id=source\.id/);
  assert.match(migration302, /'destination_branch_id',a\.branch_id/);
  assert.match(migration302, /result:=public\.save_schedule_week_with_destinations/);
  assert.match(migration302, /saved_week:=public\.save_schedule_week_with_destinations/);
  assert.match(migration302, /a\.schedule_week_id=roster\.id or a\.projected_from_schedule_week_id=roster\.id/);
});

test("schedule offers a separate cross-outlet weekly overview without replacing the planner", () => {
  assert.match(page, /view=overview/);
  assert.match(page, /All outlets · weekly overview/);
  assert.match(page, /StatusBadge status=\{outlet\.status\}/);
  assert.match(page, /assignedPeople/);
  assert.match(page, /assignedDays/);
  assert.match(page, /<SchedulePlanner/);
  assert.match(query, /export async function getScheduleOverview/);
  assert.match(query, /schedule_weeks/);
  assert.match(query, /shift_assignment_revisions/);
});

test("submitted schedules expose one primary Manager decision and readable failures", () => {
  assert.match(source, /week\?\.status\s*===\s*"submitted"/);
  assert.match(source, /Approve & publish[\s\S]*Return to Supervisor/);
  assert.match(source, /readJsonResponse/);
  assert.match(source, /actionFeedback/);
  assert.match(source, /disabled=\{busyAction !== null\}/);
});

test("weekly scheduling supports cross-outlet staff and recalculates imported punches after approval", () => {
  assert.match(query, /get_schedule_staff_candidates/);
  assert.match(source, /Add employee/);
  assert.match(source, /Remove from this outlet week/);
  assert.match(migration281, /Staff is not eligible for outlet scheduling/);
  assert.doesNotMatch(migration281, /Staff is not active in the selected outlet/);
  assert.match(migration281, /parser_profile='view_attendance_punch'/);
  assert.match(migration281, /recalculate_attendance_week\(batch\.id\)/);
});

test("schedule actions retain independent pending states", () => {
  assert.match(source, /busyAction === "submit" \? "Submitting…"/);
  assert.match(source, /busyAction === "save" \? "Saving…"/);
  assert.doesNotMatch(source, /const \[busy, setBusy\]/);
});

test("unscheduled punch evidence embeds the mapped staff relationship explicitly", () => {
  assert.match(query, /staffs!ngteco_person_mappings_staff_id_fkey\(full_name\)/);
  assert.doesNotMatch(query, /person_id,staff_id,staffs\(full_name\)/);
});
