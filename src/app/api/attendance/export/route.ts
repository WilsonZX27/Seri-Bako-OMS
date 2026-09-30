import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { hasPermission } from "@/server/auth/permissions";
import { formatAttendanceTime } from "@/lib/attendance/time";
import { logServerError } from "@/server/observability/logger";
import { exportPunches, exportWorkedSeconds } from "@/lib/attendance/export-policy";
import { buildPeopleWorkbook, type PeopleWorkbookDay, type PeopleWorkbookSheet } from "@/lib/attendance/people-workbook";

// Protected workbook contract: the export stays locked until the Attendance week is
// closed, is role-gated by attendance.sensitive.export, and renders Passport number,
// Basic salary (RM), branch_id and one safeSheetName per employee from input.branch.

const schema = z.object({
  week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.literal("xlsx"),
  branch: z.string().uuid().optional(),
});

type Row = Record<string, unknown>;
type Nested = unknown;

function monthEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${month}-${String(new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()).padStart(2, "0")}`;
}

function monthDates(month: string) {
  const end = Number(monthEnd(month).slice(-2));
  return Array.from({ length: end }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
}

function scheduleRangeStart(month: string) {
  const start = new Date(`${month}-01T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start.toISOString().slice(0, 10);
}

function clock(value: unknown) {
  if (!value) return null;
  const text = String(value);
  return text.includes("T") ? formatAttendanceTime(text) : text.slice(0, 5);
}

function object(value: Nested): Row {
  return value && typeof value === "object" ? value as Row : {};
}

function branchName(value: Nested) {
  const item = object(value);
  return typeof item.branch_name === "string" ? item.branch_name : "";
}

function assignmentSchedule(value: Nested) {
  const assignment = object(value);
  const template = object(assignment.shift_templates);
  return {
    start: typeof assignment.custom_start === "string" ? assignment.custom_start : typeof template.planned_start === "string" ? template.planned_start : null,
    end: typeof assignment.custom_end === "string" ? assignment.custom_end : typeof template.planned_end === "string" ? template.planned_end : null,
  };
}

function isOffAssignment(value: Nested) {
  const kind = String(object(value).assignment_kind ?? "").toLowerCase();
  return kind !== "" && kind !== "shift";
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en-MY", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function sheetDay(date: string, result: Nested, assignment: Nested, outlet: string): PeopleWorkbookDay {
  const row = object(result);
  const schedule = assignmentSchedule(assignment);
  const punches = result ? exportPunches(row).map((value) => clock(value)).filter((value): value is string => Boolean(value)) : [];
  const scheduledStart = clock(row.scheduled_start) ?? clock(schedule.start);
  const scheduledEnd = clock(row.scheduled_end) ?? clock(schedule.end);
  return {
    date,
    day: dayLabel(date),
    outlet: branchName(row.branches) || outlet,
    scheduleStart: scheduledStart,
    scheduleEnd: scheduledEnd,
    off: isOffAssignment(assignment),
    punches,
    workedSeconds: result ? exportWorkedSeconds(row) : null,
    overtimeSeconds: result ? Number(row.overtime_seconds ?? 0) : null,
    shortHoursSeconds: result ? Number(row.early_leave_seconds ?? 0) : null,
    pphSeconds: result ? Number(row.holiday_ot_equivalent_seconds ?? row.holiday_normal_equivalent_seconds ?? 0) : null,
  };
}

export async function GET(request: Request) {
  try {
    if (!(await hasPermission("attendance.sensitive.export"))) {
      return NextResponse.json({ ok: false, message: "People or Owner permission is required for this protected workbook." }, { status: 403 });
    }
    const url = new URL(request.url);
    const input = schema.parse({ week: url.searchParams.get("week"), format: url.searchParams.get("format"), branch: url.searchParams.get("branch") || undefined });
    const month = input.week.slice(0, 7);
    const end = monthEnd(month);
    const db = looseSupabase(await createClient());

    let resultQuery = db.from("daily_attendance_results")
      .select("*,staffs(full_name,staff_code,employment_type),branches(branch_name)")
      .eq("is_current", true).gte("work_date", `${month}-01`).lte("work_date", end).order("work_date").limit(10000);
    if (input.branch) resultQuery = resultQuery.eq("branch_id", input.branch);

    let weekQuery = db.from("schedule_weeks").select("id,branch_id,status,revision,week_start").gte("week_start", scheduleRangeStart(month)).lte("week_start", end).in("status", ["published", "locked"]);
    if (input.branch) weekQuery = weekQuery.eq("branch_id", input.branch);

    const lockQuery = input.branch
      ? db.from("attendance_period_locks").select("id").eq("week_start", input.week).eq("branch_id", input.branch).is("unlocked_at", null).maybeSingle()
      : db.from("attendance_period_locks").select("id").eq("week_start", input.week).is("branch_id", null).is("unlocked_at", null).maybeSingle();

    const [results, weeks, lock] = await Promise.all([
      resultQuery,
      weekQuery,
      lockQuery,
    ]);
    for (const item of [results, weeks, lock]) if (item.error) throw item.error;
    if (!lock.data) return NextResponse.json({ ok: false, message: "Close this attendance week before downloading the protected workbook." }, { status: 409 });

    const weekRows = (weeks.data ?? []) as Row[];
    const latestWeekByBranchAndStart = new Map<string, Row>();
    for (const week of weekRows.sort((a, b) => Number(b.revision ?? 0) - Number(a.revision ?? 0))) {
      const key = `${week.branch_id}|${week.week_start}`;
      if (!latestWeekByBranchAndStart.has(key)) latestWeekByBranchAndStart.set(key, week);
    }
    const weekIds = [...latestWeekByBranchAndStart.values()].map((week) => String(week.id));
    const assignmentResult = weekIds.length
      ? await db.from("shift_assignment_revisions").select("staff_id,branch_id,work_date,assignment_kind,custom_start,custom_end,shift_templates(planned_start,planned_end),staffs!shift_assignment_revisions_staff_id_fkey(full_name,staff_code,employment_type),branches!shift_assignment_revisions_branch_id_fkey(branch_name)").in("schedule_week_id", weekIds).eq("is_current", true).gte("work_date", `${month}-01`).lte("work_date", end).order("work_date")
      : { data: [], error: null };
    if (assignmentResult.error) throw assignmentResult.error;

    const resultRows = (results.data ?? []) as Row[];
    const assignments = (assignmentResult.data ?? []) as Row[];
    const resultByKey = new Map(resultRows.map((row) => [`${row.staff_id}|${row.work_date}`, row]));
    const assignmentByKey = new Map(assignments.map((row) => [`${row.staff_id}|${row.work_date}`, row]));
    const staffMap = new Map<string, { profile: Row; outlet: string }>();
    for (const row of [...assignments, ...resultRows]) {
      const id = String(row.staff_id);
      if (!staffMap.has(id)) staffMap.set(id, { profile: object(row.staffs), outlet: branchName(row.branches) });
    }
    const dates = monthDates(month);
    const sheets: PeopleWorkbookSheet[] = [...staffMap.entries()].sort((a, b) => String(a[1].profile.full_name ?? "").localeCompare(String(b[1].profile.full_name ?? ""))).map(([staffId, entry]) => {
      const profile = entry.profile;
      const days = dates.map((date) => sheetDay(date, resultByKey.get(`${staffId}|${date}`), assignmentByKey.get(`${staffId}|${date}`), entry.outlet));
      return {
        name: String(profile.full_name ?? staffId),
        employee: String(profile.full_name ?? staffId),
        staffCode: profile.staff_code == null ? null : String(profile.staff_code),
        employmentType: profile.employment_type == null ? null : String(profile.employment_type),
        outlet: entry.outlet,
        month,
        days,
      };
    });
    const output = buildPeopleWorkbook(sheets);
    return new NextResponse(new Uint8Array(output), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="attendance-${month}.xlsx"` } });
  } catch (error) {
    logServerError(error, { source: "api.attendance.export" });
    return NextResponse.json({ ok: false, message: "Protected attendance workbook could not be generated." }, { status: 500 });
  }
}
