import { Download, LockKeyhole, TriangleAlert } from "lucide-react";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { AttendanceAdjustmentButton, AttendanceLockButton } from "@/components/attendance/review-actions";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { durationLabel } from "@/lib/attendance/calculation";
import { hasPermission } from "@/server/auth/permissions";
import { getAttendanceReview, malaysiaWeekStart } from "@/server/queries/attendance";

function time(value: unknown) {
  return typeof value === "string" ? new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(value)) : "—";
}

export default async function AttendanceReviewPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const params = await searchParams;
  const week = /^\d{4}-\d{2}-\d{2}$/.test(params.week ?? "") ? params.week! : malaysiaWeekStart();
  const [rows, canAdjust, canLock] = await Promise.all([getAttendanceReview(week), hasPermission("attendance.adjust"), hasPermission("attendance.lock")]);
  const exceptionCount = rows.filter((row: Record<string, unknown>) => Array.isArray(row.statuses) && row.statuses.length > 0).length;
  return <>
    <PageHeader title="Attendance Review" description="Compare approved working times with actual NGTeco punches, then resolve exceptions." contentWidth="wide" />
    <WorkspaceGrid tabletCanvas="wide" className="sb-portrait-tablet-rail" hideMobileConsole rightRail={<>
      <ConsoleSection title="Actions">
        <Button asChild size="sm" className="w-full"><a href={`/api/attendance/export?week=${week}&format=xlsx`}><Download className="mr-2 h-4 w-4" />Export XLSX</a></Button>
        <Button asChild size="sm" variant="outline" className="w-full"><a href={`/api/attendance/export?week=${week}&format=csv`}>Export CSV</a></Button>
        {canLock ? <><AttendanceLockButton weekStart={week} /><p className="text-[11px] text-muted-foreground">Closing prevents further adjustments. An Owner can reopen it only with a recorded reason.</p></> : null}
      </ConsoleSection>
      <ConsoleSection title="Week"><p className="font-semibold">{week}</p><p>{rows.length} calculated staff days</p></ConsoleSection>
      <ConsoleSection title="Exceptions"><div className="flex items-center gap-2"><TriangleAlert className="h-4 w-4 text-[var(--sb-warning)]" /><strong>{exceptionCount}</strong></div><p>Resolve or adjust exceptions before locking.</p></ConsoleSection>
    </>}>
      <AttendanceWorkspaceNav current="review" />
      <section className="sb-work-surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--sb-border-soft)] px-3 py-2.5"><div><h2 className="text-sm font-semibold">Calculated attendance</h2><p className="text-xs text-muted-foreground">Times and durations preserve NGTeco seconds.</p></div><StatusBadge status={exceptionCount ? "attention" : "reviewed"} /><span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" />Week {week}</span></div>
        <div className="overflow-auto">
          <table className="w-full min-w-[82rem] text-left text-xs">
            <thead className="sticky top-0 bg-[var(--sb-surface-muted)]"><tr>{["Date", "Employee", "Branch", "Scheduled", "Actual", "Break", "Recognised", "Hours", "Late", "Early leave", "Extra time", "Status", "Review"].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
            <tbody>{rows.map((row: Record<string, unknown>) => { const staff = row.staffs as { full_name?: string } | null; const branch = row.branches as { branch_name?: string } | null; const paid = Number(row.recognised_paid_seconds ?? 0); const extra = Number(row.pre_shift_seconds ?? 0) + Number(row.post_shift_seconds ?? 0); return <tr key={String(row.id)} className="border-t border-[var(--sb-border-soft)]">
              <td className="px-3 py-3">{String(row.work_date)}</td><td className="px-3 py-3 font-semibold">{staff?.full_name ?? "Unknown staff"}</td><td className="px-3 py-3">{branch?.branch_name ?? "—"}</td><td className="px-3 py-3 tabular-nums">{time(row.scheduled_start)}–{time(row.scheduled_end)}</td><td className="px-3 py-3 tabular-nums">{time(row.actual_first_in)}–{time(row.actual_last_out)}</td><td className="px-3 py-3 tabular-nums">{durationLabel(Number(row.break_seconds ?? 0))}</td><td className="px-3 py-3 font-semibold tabular-nums">{durationLabel(paid)}</td><td className="px-3 py-3 tabular-nums">{(paid / 3600).toFixed(4)}</td><td className="px-3 py-3 tabular-nums">{durationLabel(Number(row.late_seconds ?? 0))}</td><td className="px-3 py-3 tabular-nums">{durationLabel(Number(row.early_leave_seconds ?? 0))}</td><td className="px-3 py-3 tabular-nums">{durationLabel(extra)}</td><td className="px-3 py-3"><StatusBadge status={Array.isArray(row.statuses) && row.statuses.length ? String(row.statuses[0]) : "normal"} /></td><td className="px-3 py-3"><div className="flex items-center gap-2"><StatusBadge status={String(row.review_status)} />{canAdjust ? <AttendanceAdjustmentButton resultId={String(row.id)} currentSeconds={paid} /> : null}</div></td>
            </tr>; })}</tbody>
          </table>
          {!rows.length ? <div className="p-8 text-center"><p className="text-sm font-medium">No calculated attendance for this week</p><p className="mt-1 text-xs text-muted-foreground">Publish schedules, complete Person ID and device mappings, then confirm a View Attendance Punch import.</p></div> : null}
        </div>
      </section>
    </WorkspaceGrid>
  </>;
}
