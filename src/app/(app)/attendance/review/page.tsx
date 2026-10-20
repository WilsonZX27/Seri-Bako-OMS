import { ScheduleRefreshStatus } from "@/components/attendance/schedule-refresh-status";
import { Fragment } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck2,
  CalendarDays,
  TriangleAlert,
} from "lucide-react";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { AttendanceImportWorkflow } from "@/components/attendance/attendance-import-workflow";
import { AttendanceReviewFilters } from "@/components/attendance/attendance-review-filters";
import {
  AttendanceAdjustmentButton,
  AttendanceRecalculateButton,
} from "@/components/attendance/review-actions";
import {
  OtClaimAction,
  WeeklyCloseButton,
} from "@/components/attendance/ot-ro-actions";
import { PeopleWorkbookExport } from "@/components/attendance/people-workbook-export";
import { ActualAttendancePanel } from "@/components/attendance/actual-attendance-panel";
import { EmployeeAttendanceSummary } from "@/components/attendance/employee-attendance-summary";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { TableScrollRegion } from "@/components/ui/table-scroll-region";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { exportShortHoursSeconds } from "@/lib/attendance/export-policy";
import { durationLabel } from "@/lib/attendance/calculation";
import { formatAttendanceTime } from "@/lib/attendance/time";
import { getPermissionMap } from "@/server/auth/permissions";
import {
  getAttendanceActuals,
  getAttendanceMappings,
  getAttendanceReview,
  getAttendanceWeekBlockers,
  getAttendanceReviewBranches,
  ATTENDANCE_TRACKING_START_DATE,
  malaysiaWeekStart,
} from "@/server/queries/attendance";

type Row = Record<string, unknown>;
type Claim = {
  id: string;
  status: string;
  candidate_minutes: number;
  requested_minutes: number;
  decided_minutes: number | null;
};

function time(value: unknown) {
  return typeof value === "string"
    ? formatAttendanceTime(value, { seconds: true })
    : "—";
}
function duration(value: unknown) {
  const seconds = Number(value ?? 0);
  return seconds > 0 ? durationLabel(seconds) : "—";
}
function minuteDuration(value: unknown) {
  const seconds = Math.max(0, Number(value ?? 0));
  if (seconds > 0 && seconds < 60) return "<00:01";
  const totalMinutes = Math.floor(seconds / 60);
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}
function dateHeading(value: unknown) {
  const raw=String(value);const [year,month,day]=raw.split("-");
  const weekday=new Intl.DateTimeFormat("en-MY",{weekday:"long",timeZone:"UTC"}).format(new Date(`${raw}T00:00:00Z`));
  return `${day}/${month}/${year} (${weekday})`;
}
function signedDuration(value: unknown, tone: "late" | "earlyLeave" | "ot") {
  const seconds = Number(value ?? 0);
  if (seconds <= 0) return null;
  const prefix = tone === "earlyLeave" ? "−" : "+";
  const label = tone === "ot" ? "" : tone === "earlyLeave" ? "early" : "late";
  const className = tone === "ot" ? "text-[var(--sb-success)]" : "text-[var(--sb-danger)]";
  return <span className={`mt-0.5 block text-[11px] font-medium tabular-nums ${className}`}>{prefix}{durationLabel(seconds)}{label ? ` ${label}` : ""}</span>;
}
function fingerprintExempt(row:Row){return (row.calculation as {fingerprint_exempt?:boolean}|null)?.fingerprint_exempt===true;}
function primaryStatus(row: Row) {
  const values = Array.isArray(row.statuses)
    ? row.statuses.map(String).filter((value) => value !== "public_holiday")
    : [];
  return values.find(value=>value!=="unpaid_leave") ?? (values.includes("unpaid_leave") ? "unpaid_leave" : undefined) ?? (fingerprintExempt(row)?"fingerprint_exempt":row.holiday_id ? "public_holiday" : "normal");
}
function expectedPunchesFor(row: Row) {
  if(fingerprintExempt(row))return 0;
  if (Array.isArray(row.statuses) && row.statuses.includes("unpaid_leave")) return 0;
  return 4;
}
const BLOCKING_ATTENDANCE_STATUSES = new Set([
  "missing_punches",
  "missing_check_in",
  "missing_check_out",
  "odd_punch_count",
  "impossible_ordering",
  "duplicate_punch",
  "unexpected_punch_count",
  "missing_break_punch",
  "unpaid_leave_punch_conflict",
]);
function pageHref(params: Record<string, string | undefined>, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value) query.set(key, value);
  query.set("page", String(page));
  return `/attendance/review?${query}`;
}

export default async function AttendanceReviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    branch?: string;
    status?: string;
    employee?: string;
    page?: string;
    batch?: string;
    detail?: string;
    mapping?: string;
    import?: string;
    report?: string;
  }>;
}) {
  const params = await searchParams;
  const mappingMode = params.mapping === "1";
  const importMode = params.import === "1";
  const week = /^\d{4}-\d{2}-\d{2}$/.test(params.week ?? "")
    ? params.week!
    : malaysiaWeekStart();
  const page = Math.max(1, Number(params.page) || 1);
  const branch = params.branch && params.branch !== "select" ? params.branch : undefined;
  const permissions = await getPermissionMap([
    "attendance.adjust",
    "attendance.import",
    "attendance.map",
    "attendance.report.submit",
    "attendance.report.approve",
    "comp_time.submit",
    "comp_time.approve",
    "attendance.ot.submit",
    "attendance.ot.approve",
    "attendance.week.close",
    "attendance.sensitive.export",
  ]);
  const [review, actuals, mappings, closeRows] = await Promise.all([
    branch ? getAttendanceReview(week, {
      branch,
      status: params.status,
      employee: params.employee,
      page,
      detail: params.detail,
    }) : getAttendanceReviewBranches().then((branches) => ({ rows: [], total: 0, page: 1, pageSize: 100, branches, batches: [], unscheduledPunches: [], detail: null })),
    branch ? getAttendanceActuals(week, branch) : Promise.resolve({ assignments: [], reports: [], ledger: [], balances: {}, claims: [], reservations: [], locks: [] }),
    permissions["attendance.import"]
      ? getAttendanceMappings()
      : Promise.resolve(null),
    branch && permissions["attendance.week.close"] ? getAttendanceWeekBlockers(week,branch) : Promise.resolve([]),
  ]);
  const rows = review.rows as Row[];
  const claims = actuals.claims as Row[];
  const reservations = actuals.reservations as Array<{
    id: string;
    reserved_minutes: number;
    recommended_used_minutes: number | null;
    work_date: string;
    staff_id?: string;
    status?: string;
    final_used_minutes?: number | null;
    staffs?: { full_name?: string } | null;
  }>;
  const attentionCount = rows.filter(
    (row) => !["normal","unpaid_leave","fingerprint_exempt"].includes(primaryStatus(row)),
  ).length;
  const blockerCount = closeRows.length;
  const exceptionCount = blockerCount;
  const filterParams = {
    week,
    branch,
    status: params.status,
    employee: params.employee,
  };
  const blockerRows = (closeRows as Row[])
    .map((row) => {
      const staff = row.staffs as { full_name?: string } | null;
      const reason = (Array.isArray(row.statuses) ? row.statuses : [])
        .map(String)
        .find((status) => BLOCKING_ATTENDANCE_STATUSES.has(status))
        ?.replaceAll("_", " ") ?? (Array.isArray(row.attendance_exceptions) ? row.attendance_exceptions.find((item)=>item.severity === "blocker" && item.resolved_at == null)?.exception_code?.replaceAll("_"," ") : null) ?? "Attendance exception";
      return {
        id: String(row.id),
        employee: staff?.full_name ?? "Unmatched employee",
        date: String(row.work_date),
        reason,
        href: `${pageHref({ week, branch }, 1)}&detail=${encodeURIComponent(String(row.id))}`,
      };
    });
  const latest = review.batches[0] as Row | undefined;
  const totalPages = Math.max(1, Math.ceil(review.total / review.pageSize));
  const weekLocked = (actuals.locks as unknown[]).length > 0;
  const rowContext = (row: Row) => {
    const staff = row.staffs as {
      full_name?: string;
      staff_code?: string;
      employment_type?: string;
    } | null;
    const candidate = Number(
      row.overtime_candidate_seconds ??
        (row.calculation as Row | null)?.overtime_candidate_seconds ??
        0,
    );
    const claim = claims.find(
      (item) =>
        String(item.staff_id) === String(row.staff_id) &&
        String(item.work_date) === String(row.work_date) &&
        ["submitted", "approved", "credited"].includes(String(item.status)),
    ) as Claim | undefined;
    const reservation=reservations.find(item=>String(item.staff_id)===String(row.staff_id)&&String(item.work_date)===String(row.work_date));
    const actualOvertime = Number(row.post_shift_seconds ?? 0);
    return { staff, candidate, actualOvertime, claim, reservation, status: primaryStatus(row) };
  };
  const employeeSummary = (row: Row, staff: { full_name?: string; staff_code?: string; employment_type?: string } | null) => {
    const detailHref = `${pageHref(filterParams, page)}&detail=${encodeURIComponent(String(row.id))}`;
    const missingHistory = (Array.isArray(row.monthly_missing_punch_dates) ? row.monthly_missing_punch_dates : []).map((value) => {
      const [date, count = "1"] = String(value).replace(/[()]/g, "").split(" ");
      return { date, label: `${count} missing` };
    });
    const reportHistory = (actuals.reports as Row[]).filter((report) => String(report.staff_id) === String(row.staff_id)).map((report) => ({ date: String(report.work_date), label: String(report.report_type ?? report.status ?? "Attendance report").replaceAll("_", " ").toUpperCase() }));
    return <EmployeeAttendanceSummary name={staff?.full_name ?? "Unmatched employee"} staffCode={staff?.staff_code} employmentType={staff?.employment_type ?? "full_time"} workDate={String(row.work_date)} punches={fingerprintExempt(row)?"Fingerprint exempt":`${Number(row.actual_punch_count ?? 0)} of ${Number(row.expected_punch_count ?? 0)} punches`} missingHistory={missingHistory} reportHistory={reportHistory} detailHref={detailHref} peopleHref={staff && row.staff_id ? `/people/${encodeURIComponent(String(row.staff_id))}` : undefined} />;
  };

  return (
    <>
      <PageHeader
        title="Actual Attendance"
        description="Compare each staff day with the published schedule and resolve exceptions before closing the week."
        contentWidth="wide"
      />
      <WorkspaceGrid
        tabletRailMode="context"
        tabletCanvas="wide"
        className="sb-portrait-tablet-rail"
        hideMobileConsole
        rightRail={
          <>
            <ConsoleSection title="Actions" kind="action">
              {permissions["attendance.week.close"] ? (
                <WeeklyCloseButton
                  weekStart={week}
                  branchId={branch ?? null}
                  reservations={reservations.filter(
                    (row) => (row as unknown as Row).status === "reserved",
                  )}
                  exceptionCount={exceptionCount}
                  pendingReportCount={(actuals.reports as Row[]).filter((row) => String(row.status) === "pending").length}
                  submittedClaimCount={claims.filter((row) => String(row.status) === "submitted").length}
                  blockers={blockerRows}
                  reviewHref={pageHref(filterParams, page)}
                  disabled={weekLocked || !branch}
                />
              ) : null}
              {!branch && permissions["attendance.week.close"] ? <p className="mt-2 text-xs text-muted-foreground">Select an outlet to review its blockers and close this week.</p> : null}
              {latest &&
              (permissions["attendance.import"] ||
                permissions["attendance.adjust"]) ? (
                <AttendanceRecalculateButton batchId={String(latest.id)} disabled={weekLocked} />
              ) : null}
              {permissions["attendance.sensitive.export"] ? (
                <PeopleWorkbookExport branches={review.branches as {id:string;branch_name:string}[]} week={week} branchId={branch}/>
              ) : null}
            </ConsoleSection>
            <ScheduleRefreshStatus week={week} branch={branch} canRefresh={Boolean(permissions["attendance.import"] || permissions["attendance.adjust"])} />
            <ConsoleSection title="Week status" kind="status">
              <p className="font-semibold">{week}</p>
              <p>
                {review.total} staff days · {blockerCount} blockers · {attentionCount} attention items
              </p>
              <StatusBadge status={weekLocked ? "locked" : "open"} />
              {latest ? (
                <div className="mt-2 border-t border-[var(--sb-border-soft)] pt-2">
                  <p className="font-medium">Latest import</p>
                  <p className="break-words text-muted-foreground">
                    {String(latest.file_name)}
                  </p>
                  <p>
                    {String(latest.row_count)} rows · {String(latest.status)}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No import finalised for this week.
                </p>
              )}
            </ConsoleSection>
            {review.detail ? (
              <AttendanceDetail detail={review.detail as Row} />
            ) : null}

            <div className="space-y-2" aria-labelledby="attendance-tools-title">
              <h2 id="attendance-tools-title" className="sr-only">Reports & time-off balance</h2>
                <ActualAttendancePanel
                  scheduleHref={`/attendance/schedule?branch=${encodeURIComponent(branch ?? "")}&week=${week}`}
                  assignments={actuals.assignments as Row[]}
                  reports={actuals.reports as Row[]}
                  ledger={actuals.ledger}
                  balances={actuals.balances}
                  canSubmit={permissions["attendance.report.submit"]}
                  canApprove={permissions["attendance.report.approve"]}
                  canSubmitComp={permissions["comp_time.submit"]}
                  canApproveComp={permissions["comp_time.approve"]}
                  compact
                />
            </div>
          </>
        }
      >
        <AttendanceWorkspaceNav current="review" />
        {mappings?.allowed ? (
          <details
            id="import-punches"
            className="group sb-work-surface overflow-hidden"
            open={importMode || mappingMode || !latest}
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sb-green-100)] text-[var(--sb-green-900)]">
                {latest ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <FileCheck2 className="h-4 w-4" />
                )}
              </span>
              <strong className="min-w-0 flex-1 truncate text-sm font-medium">
                {importMode
                  ? "Import NGTeco raw punches"
                  : mappingMode
                  ? "Review missing Person ID mappings"
                  : latest
                  ? "Import another raw punch file"
                  : "Import NGTeco raw punches"}
              </strong>
              <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            </summary>
            <div className="border-t border-[var(--sb-border-soft)] p-3">
              <AttendanceImportWorkflow
                staffs={mappings.staffs}
                mappedPersonIds={(mappings.people as Row[])
                  .filter((row) => row.is_active !== false)
                  .map((row) => String(row.person_id))}
                mappedSources={(mappings.devices as Row[])
                  .filter((row) => row.is_active !== false)
                  .map((row) => String(row.source_code))}
                canMap={mappings.allowed}
              />
            </div>
          </details>
        ) : null}
        <AttendanceReviewFilters
          branches={(review.branches as Row[]).map((item) => ({
            id: String(item.id),
            branch_name: String(item.branch_name),
          }))}
          defaults={{
            branch: branch ?? "select",
            week,
            employee: params.employee ?? "",
            status: params.status ?? "all",
          }}
          total={review.total}
        />

        {branch && review.unscheduledPunches.length ? (
          <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border border-amber-200 bg-amber-50">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 px-4 py-3">
              <div><h2 className="text-sm font-semibold">Imported punches requiring schedule review</h2><p className="mt-0.5 text-xs text-muted-foreground">Device outlet and scheduled work outlet may differ. Review the schedule state below; original punches are preserved.</p></div>
              <Button asChild size="sm" variant="outline"><Link href={`/attendance/schedule?branch=${encodeURIComponent(branch)}&week=${week}`}>Add schedule</Link></Button>
            </header>
            <div className="divide-y divide-amber-200">
              {review.unscheduledPunches.map((item) => <div key={`${item.staff_id}:${item.work_date}`} className="grid gap-1 px-4 py-2.5 text-xs sm:grid-cols-[minmax(0,1fr)_7rem_10rem] sm:items-center"><div><strong>{item.full_name}</strong><p className="mt-1 text-muted-foreground">Home: {item.home_branch}</p><p className="mt-1">Schedule: {item.scheduled_branch} · {item.schedule_status}</p></div><span className="tabular-nums">{item.work_date}</span><span className="tabular-nums text-muted-foreground">{item.punch_count} punches · {time(item.first_punch)}–{time(item.last_punch)}</span></div>)}
            </div>
          </section>
        ) : null}

        {!branch ? (
          <section className="sb-work-surface p-10 text-center">
            <TriangleAlert className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold">Select an outlet to load attendance</p>
          </section>
        ) : <section className="sb-work-surface overflow-hidden">
          <header className="flex flex-wrap items-center gap-3 border-b border-[var(--sb-border-soft)] px-4 py-3">
            <h2 className="w-full text-sm font-semibold md:w-auto">
              Schedule vs fingerprint punches
            </h2>
            <StatusBadge status={attentionCount ? "attention" : "reviewed"} />
            <span className="ml-auto text-xs text-muted-foreground">
              {review.total} {review.total === 1 ? "result" : "results"}
            </span>
          </header>
          <TableScrollRegion label="Attendance results" className="hidden md:block">
            <table id="attendance-review-results" className="w-full min-w-[48rem] table-fixed text-left text-xs">
              <colgroup>
                {[16, 9, 12, 10, 12, 9, 10, 22].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}
              </colgroup>
              <thead className="sticky top-0 z-10 bg-[var(--sb-surface-muted)]">
                <tr>
                  {[
                    "Employee",
                    "Punches",
                    "Clock in",
                    "Break",
                    "Clock out",
                    "Worked",
                    "RO\nOT",
                    "Actions",
                  ].map((label) => (
                    <th key={label} className="whitespace-pre-line px-3 py-2.5 first:sticky first:left-0 first:bg-[var(--sb-surface-muted)]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const { staff, candidate, actualOvertime, claim, reservation } = rowContext(row);
                  const actualPunches = Number(row.actual_punch_count ?? 0);
                  const expectedPunches = expectedPunchesFor(row);
                  const missingPunches = Math.max(0, expectedPunches - actualPunches);
                  const newDay =
                    index === 0 ||
                    String(rows[index - 1]?.work_date) !==
                      String(row.work_date);
                  return (
                    <Fragment key={String(row.id)}>
                      {newDay ? (
                        <tr className="border-t border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)]">
                          <th colSpan={8} className="px-3 py-2 font-semibold">
                            <span className="sticky left-3 inline-block">{dateHeading(row.work_date)}</span>
                          </th>
                        </tr>
                      ) : null}
                      <tr className="border-t border-[var(--sb-border-soft)] hover:bg-[var(--sb-surface-muted)]">
                        <td className="sticky left-0 z-[1] bg-white px-3 py-3">
                          {employeeSummary(row, staff)}
                          <span className="text-[11px] text-muted-foreground">
                            {staff?.employment_type === "part_time"
                              ? "Part-time"
                              : "Full-time"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <strong className="tabular-nums">
                            {actualPunches} of {expectedPunches}
                          </strong>
                          {missingPunches > 0 ? (
                            <span title={`Advisory only; payroll is unchanged. Tracking starts ${ATTENDANCE_TRACKING_START_DATE}.${Array.isArray(row.monthly_missing_punch_dates) && row.monthly_missing_punch_dates.length ? ` Missing records: ${row.monthly_missing_punch_dates.join(", ")}.` : ""}`} className="block max-w-full cursor-help text-[10px] leading-tight text-amber-800">
                              {!fingerprintExempt(row) && String(row.work_date) >= ATTENDANCE_TRACKING_START_DATE && Number(row.monthly_missing_punch_count ?? 0) >= 4
                                ? `${Number(row.monthly_missing_punch_count)} missing this month`
                                : "Missing punch"}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          <strong className="block">Actual: {time(row.actual_first_in)}</strong>
                          <span className="block text-[11px] text-muted-foreground">Scheduled: {time(row.scheduled_start)}</span>
                          {signedDuration(row.late_seconds, "late")}
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          {row.actual_break_out && row.actual_break_in ? <><strong className="block">{time(row.actual_break_out)}–{time(row.actual_break_in)}</strong><span className="block text-[11px] text-muted-foreground">{duration(row.break_seconds)}</span></> : duration(row.break_seconds)}
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          <strong className="block">Actual: {time(row.actual_last_out)}</strong>
                          <span className="block text-[11px] text-muted-foreground">Scheduled: {time(row.scheduled_end)}</span>
                          {Number(row.early_leave_seconds ?? 0) > 0
                            ? signedDuration(row.early_leave_seconds, "earlyLeave")
                            : signedDuration(actualOvertime, "ot")}
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          {duration(row.worked_seconds)}
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          <span className="block text-[11px] text-muted-foreground">RO {reservation ? `${Math.floor(Number(reservation.final_used_minutes??reservation.reserved_minutes) / 30)} × 30m` : "—"}</span>
                          <span className="block text-[11px]">Approved {duration(row.overtime_seconds)}</span>
                          {candidate > Number(row.overtime_seconds ?? 0) ? <strong className="mt-1 block rounded bg-[var(--sb-warning-bg)] px-1 text-[11px] text-[var(--sb-warning)]">Pending {duration(candidate - Number(row.overtime_seconds ?? 0))}</strong> : null}
                        </td>
                        <td className="px-3 py-3">
                          <RowActions
                            row={row}
                            claim={claim}
                            candidate={candidate}
                            reportable={actuals.assignments.some((assignment:Row)=>assignment.id===row.assignment_id)}
                            permissions={permissions}
                            weekLocked={weekLocked}
                            href={`${pageHref(filterParams, page)}&detail=${encodeURIComponent(String(row.id))}`}
                          />
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </TableScrollRegion>
          <div className="divide-y divide-[var(--sb-border-soft)] md:hidden">
            {rows.map((row, index) => {
              const { staff, candidate, actualOvertime, claim, reservation, status } = rowContext(row);
              const actualPunches = Number(row.actual_punch_count ?? 0);
              const expectedPunches = expectedPunchesFor(row);
              const missingPunches = Math.max(0, expectedPunches - actualPunches);
              const newDay =
                index === 0 ||
                String(rows[index - 1]?.work_date) !== String(row.work_date);
              return (
                <div key={String(row.id)}>
                  {newDay ? (
                    <h3 className="bg-[var(--sb-surface-muted)] px-3 py-2 text-xs font-semibold">
                      {dateHeading(row.work_date)}
                    </h3>
                  ) : null}
                  <article className="p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        {employeeSummary(row, staff)}
                        <p className="text-[11px] text-muted-foreground">
                          {staff?.employment_type === "part_time"
                            ? "Part-time"
                            : "Full-time"}{" "}
                          · {time(row.scheduled_start)}–
                          {time(row.scheduled_end)}
                        </p>
                      </div>
                      <StatusBadge status={status} label={status === "unpaid_leave" ? "Approved unpaid leave" : status === "unpaid_leave_punch_conflict" ? "Unpaid leave conflicts with punches" : ["posted", "reviewed"].includes(status) ? "Calculated" : undefined} />
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
                      <div>
                        <dt className="text-muted-foreground">Punches</dt>
                        <dd className="font-semibold">
                          {actualPunches} of {expectedPunches}
                        </dd>
                        {missingPunches > 0 ? (
                          <dd title={`Advisory only; payroll is unchanged. Tracking starts ${ATTENDANCE_TRACKING_START_DATE}.${Array.isArray(row.monthly_missing_punch_dates) && row.monthly_missing_punch_dates.length ? ` Missing records: ${row.monthly_missing_punch_dates.join(", ")}.` : ""}`} className="max-w-full cursor-help text-[10px] leading-tight text-amber-800">
                            {!fingerprintExempt(row) && String(row.work_date) >= ATTENDANCE_TRACKING_START_DATE && Number(row.monthly_missing_punch_count ?? 0) >= 4
                              ? `${Number(row.monthly_missing_punch_count)} missing this month`
                              : "Missing punch"}
                          </dd>
                        ) : null}
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Clock in</dt>
                        <dd>Actual: {time(row.actual_first_in)}</dd>
                        <dd className="text-muted-foreground">Scheduled: {time(row.scheduled_start)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Clock out</dt>
                        <dd>Actual: {time(row.actual_last_out)}</dd>
                        <dd className="text-muted-foreground">Scheduled: {time(row.scheduled_end)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Break</dt>
                        <dd>{duration(row.break_seconds)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Worked</dt>
                        <dd>{duration(row.worked_seconds)}</dd>
                      </div>
                      {Number(row.late_seconds ?? 0) > 0 ? (
                        <div>
                          <dt className="text-muted-foreground">Late</dt>
                          <dd>{duration(row.late_seconds)}</dd>
                        </div>
                      ) : null}
                      {Number(row.early_leave_seconds ?? 0) > 0 ? (
                        <div>
                          <dt className="text-muted-foreground">Early leave</dt>
                          <dd>{duration(row.early_leave_seconds)}</dd>
                        </div>
                      ) : null}
                      {actualOvertime > 0 ? (
                        <div>
                          <dt className="text-muted-foreground">After shift (unapproved)</dt>
                          <dd>{minuteDuration(actualOvertime)}</dd>
                        </div>
                      ) : null}
                      <div><dt className="text-muted-foreground">Approved OT / RO credit</dt><dd>{duration(row.overtime_seconds)}</dd></div>
                      {candidate > Number(row.overtime_seconds ?? 0) ? <div className="rounded bg-[var(--sb-warning-bg)] p-2"><dt>Pending People approval</dt><dd>{duration(candidate - Number(row.overtime_seconds ?? 0))}</dd></div> : null}
                      <div><dt className="text-muted-foreground">Short hours · late + early leave</dt><dd>{exportShortHoursSeconds(row) == null ? "Needs punch review" : duration(exportShortHoursSeconds(row))}</dd></div>
                      {reservation ? <div><dt className="text-muted-foreground">RO</dt><dd>{reservation.final_used_minutes??reservation.reserved_minutes} min · <span className="capitalize">{reservation.status??"reserved"}</span></dd></div>:null}
                    </dl>
                    <div className="mt-3">
                      <RowActions
                        row={row}
                        claim={claim}
                        candidate={candidate}
                        reportable={actuals.assignments.some((assignment:Row)=>assignment.id===row.assignment_id)}
                        permissions={permissions}
                        weekLocked={weekLocked}
                        href={`${pageHref(filterParams, page)}&detail=${encodeURIComponent(String(row.id))}`}
                      />
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
          {!rows.length ? (
            <div className="p-10 text-center">
              <TriangleAlert className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold">
                No matching attendance records
              </p>
              <p className="mt-1 text-xs text-muted-foreground">No records match these filters.</p>
              <Button asChild variant="outline" className="mt-3"><Link href={`/attendance/review?week=${encodeURIComponent(week)}&branch=${encodeURIComponent(branch ?? "select")}`}>Reset filters</Link></Button>
            </div>
          ) : null}
          {totalPages > 1 ? (
            <footer className="flex items-center justify-between border-t border-[var(--sb-border-soft)] px-3 py-2">
              <Button asChild size="sm" variant="ghost" disabled={page <= 1}>
                <Link href={pageHref(filterParams, Math.max(1, page - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Link>
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                asChild
                size="sm"
                variant="ghost"
                disabled={page >= totalPages}
              >
                <Link
                  href={pageHref(filterParams, Math.min(totalPages, page + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </footer>
          ) : null}
        </section>}
        <details className="group sb-work-surface overflow-hidden xl:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Reports & time-off balance
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          </summary>
          <div className="border-t border-[var(--sb-border-soft)] p-3">
            <ActualAttendancePanel
                  scheduleHref={`/attendance/schedule?branch=${encodeURIComponent(branch ?? "")}&week=${week}`}
              initialAssignmentId={params.report}
              assignments={actuals.assignments as Row[]}
              reports={actuals.reports as Row[]}
              ledger={actuals.ledger}
              balances={actuals.balances}
              canSubmit={permissions["attendance.report.submit"]}
              canApprove={permissions["attendance.report.approve"]}
              canSubmitComp={permissions["comp_time.submit"]}
              canApproveComp={permissions["comp_time.approve"]}
            />
          </div>
        </details>
      </WorkspaceGrid>
    </>
  );
}

function RowActions({
  row,
  claim,
  candidate,
  permissions,
  href,
  weekLocked,
  reportable,
}: {
  reportable:boolean;
  row: Row;
  claim?: Claim;
  candidate: number;
  permissions: Record<string, boolean>;
  href: string;
  weekLocked: boolean;
}) {
  return (
    <div className="inline-flex min-w-0 flex-nowrap items-center gap-1 [&_button]:font-normal">
      <Button asChild size="sm" variant="ghost" className="w-auto justify-start gap-2 bg-transparent px-2 font-normal hover:bg-[var(--sb-surface-muted)] focus-visible:bg-[var(--sb-surface-muted)]">
        <Link href={href} title="View details"><Eye className="h-4 w-4"/><span className="md:sr-only">View details</span></Link>
      </Button>
      {permissions["attendance.report.submit"] && reportable && !weekLocked ? <Button asChild size="sm" variant="ghost" className="min-h-11 px-2"><Link href={`${href}&report=${encodeURIComponent(String(row.assignment_id))}`} aria-label="Report actual attendance"><FileCheck2 className="size-4" aria-hidden="true"/></Link></Button> : null}
      {permissions["attendance.adjust"] ? (
        <AttendanceAdjustmentButton
          resultId={String(row.id)}
          currentSeconds={Number(row.payable_seconds ?? 0)}
          actualFirstIn={typeof row.actual_first_in==="string"?row.actual_first_in:null}
          actualBreakOut={typeof row.actual_break_out==="string"?row.actual_break_out:null}
          actualBreakIn={typeof row.actual_break_in==="string"?row.actual_break_in:null}
          actualLastOut={typeof row.actual_last_out==="string"?row.actual_last_out:null}
          disabled={weekLocked}
        />
      ) : (
        <StatusBadge status={String(row.review_status)} label={String(row.review_status) === "reviewed" ? "Calculated" : undefined} />
      )}
      {permissions["attendance.report.submit"] && !reportable && !weekLocked ? <Link title="Publish this staff day in the schedule before reporting leave" className="inline-flex min-h-[var(--sb-control-height)] items-center gap-2 px-2 text-xs font-medium text-warning" href={`/attendance/schedule?${href.split("?")[1] ?? ""}`} aria-label="Review schedule"><CalendarDays className="size-4" aria-hidden="true"/></Link> : null}
      <OtClaimAction
        resultId={String(row.id)}
        candidateSeconds={candidate}
        claim={claim}
        canSubmit={permissions["attendance.ot.submit"]}
        canApprove={permissions["attendance.ot.approve"]}
        disabled={weekLocked}
      />
    </div>
  );
}

function AttendanceDetail({ detail }: { detail: Row }) {
  const staff = detail.staffs as { full_name?: string } | null;
  const batch = detail.attendance_import_batches as {
    file_name?: string;
  } | null;
  const exceptions = (detail.exceptions ?? []) as Row[];
  const adjustments = (detail.adjustments ?? []) as Row[];
  return (
    <ConsoleSection title="Attendance details" kind="reference">
      <p className="font-semibold">{staff?.full_name ?? "Employee"}</p>
      <p>
        {String(detail.work_date)} · {time(detail.actual_first_in)}–
        {time(detail.actual_last_out)}
      </p>
      <dl className="mt-2 divide-y divide-[var(--sb-border-soft)]">
        <div className="flex justify-between gap-2 py-2">
          <dt className="text-muted-foreground">Import file</dt>
          <dd className="break-all text-right">{batch?.file_name ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-2 py-2">
          <dt className="text-muted-foreground">Exceptions</dt>
          <dd>{exceptions.length}</dd>
        </div>
        <div className="flex justify-between gap-2 py-2">
          <dt className="text-muted-foreground">Adjustments</dt>
          <dd>{adjustments.length}</dd>
        </div>
      </dl>
      {exceptions.map((item) => {
        const code = String(item.exception_code);
        const isLocationMismatch = code === "wrong_branch_device";
        return (
        <div
          key={String(item.id)}
          className="mt-2 rounded-[var(--sb-radius-control)] bg-[var(--sb-warning-bg)] p-2"
        >
          <strong>{isLocationMismatch ? "Punch location differs from schedule" : code.replaceAll("_", " ")}</strong>
          <p>{isLocationMismatch ? "The punch came from a device mapped to another outlet. System access does not change the fingerprint device location; verify the staff day or device mapping." : String(item.resolution_note ?? "Needs review")}</p>
        </div>
      )})}
    </ConsoleSection>
  );
}
