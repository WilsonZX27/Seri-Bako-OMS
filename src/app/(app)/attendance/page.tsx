import Link from "next/link";
import { AlertTriangle, CalendarDays, FileSpreadsheet, Fingerprint, LockKeyhole, UsersRound } from "lucide-react";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { ShiftRequestButton } from "@/components/attendance/shift-request-button";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { hasPermission } from "@/server/auth/permissions";
import { getAttendanceWorkspace, getOwnPublishedShifts } from "@/server/queries/attendance";

export default async function AttendancePage() {
  const [data, ownShifts, canSchedule, canReview, canImport] = await Promise.all([getAttendanceWorkspace(), getOwnPublishedShifts(), hasPermission("schedule.read"), hasPermission("attendance.review"), hasPermission("attendance.import")]);
  const signals = [
    { label: "Manager approvals", value: data.pendingApprovals, icon: CalendarDays, href: "/attendance/schedule" },
    { label: "Staff requests", value: data.pendingRequests, icon: UsersRound, href: "/attendance/schedule" },
    { label: "Exceptions", value: data.unresolvedExceptions, icon: AlertTriangle, href: "/attendance/review" },
    { label: "Missing mappings", value: data.missingMappings, icon: Fingerprint, href: "/attendance/imports" },
  ];
  return <>
    <PageHeader title="Attendance" description="Plan outlet shifts, compare NGTeco punches and close each Malaysia work week." />
    <WorkspaceGrid tabletCanvas="contained" className="sb-portrait-tablet-rail" hideMobileConsole rightRail={<>
      <ConsoleSection title="Actions">
        {canSchedule ? <Button asChild size="sm" className="w-full"><Link href="/attendance/schedule">Open Schedule Planner</Link></Button> : null}
        {canReview ? <Button asChild size="sm" variant="outline" className="w-full"><Link href="/attendance/review">Review attendance</Link></Button> : null}
        {canImport ? <Button asChild size="sm" variant="outline" className="w-full"><Link href="/attendance/imports">Import NGTeco file</Link></Button> : null}
      </ConsoleSection>
      <ConsoleSection title="Current week"><p className="font-semibold">{data.weekStart} – {data.weekEnd}</p><StatusBadge status={data.scheduleStatus} /></ConsoleSection>
      <ConsoleSection title="Period"><p>{data.activeLocks ? `${data.activeLocks} locked scope${data.activeLocks === 1 ? "" : "s"}` : "Open for scheduling and review"}</p></ConsoleSection>
    </>}>
      <AttendanceWorkspaceNav current="overview" />
      <section className="sb-work-surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--sb-border-soft)] px-3 py-2.5"><div><h2 className="text-sm font-semibold">This week</h2><p className="text-xs text-muted-foreground">Work queues that need attention before attendance can be locked.</p></div><StatusBadge status={data.scheduleStatus} /></div>
        <div className="grid grid-cols-2 divide-x divide-y divide-[var(--sb-border-soft)] lg:grid-cols-4">{signals.map(({ label, value, icon: Icon, href }) => <Link href={href} key={label} className="flex min-h-20 items-center gap-3 p-3 hover:bg-[var(--sb-surface-muted)]"><Icon className="h-4 w-4 shrink-0 text-[var(--sb-green-700)]"/><span><strong className="block text-lg tabular-nums">{value}</strong><span className="text-xs text-muted-foreground">{label}</span></span></Link>)}</div>
      </section>
      <section className="sb-work-surface overflow-hidden">
        <div className="border-b border-[var(--sb-border-soft)] px-3 py-2.5"><h2 className="text-sm font-semibold">My published schedule</h2><p className="text-xs text-muted-foreground">Only shifts published by a Manager appear to the employee.</p></div>
        {ownShifts.length ? <div className="divide-y divide-[var(--sb-border-soft)]">{ownShifts.map(shift => { const start=shift.shift_templates?.planned_start??shift.custom_start; const end=shift.shift_templates?.planned_end??shift.custom_end; return <div key={shift.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-xs"><span className="w-24 font-medium">{shift.work_date}</span><span className="min-w-20 text-muted-foreground">{shift.shift_templates?.code ?? shift.assignment_kind.toUpperCase()}</span>{start&&end ? <span className="tabular-nums">{start.slice(0, 5)}–{end.slice(0, 5)}</span> : null}<span className="ml-auto"><ShiftRequestButton assignmentId={shift.id}/></span></div> })}</div> : <div className="p-5"><p className="text-sm font-medium">No published shift for this week</p><p className="mt-1 text-xs text-muted-foreground">A Supervisor prepares the outlet schedule; it appears here after Manager publication.</p></div>}
      </section>
      <section className="sb-work-surface flex items-start gap-3 p-3"><FileSpreadsheet className="mt-0.5 h-4 w-4 text-[var(--sb-green-700)]"/><div><h2 className="text-sm font-semibold">Latest NGTeco import</h2><p className="mt-1 text-xs text-muted-foreground">{data.latestBatch ? `${data.latestBatch.file_name} · ${data.latestBatch.row_count} rows · ${data.latestBatch.status}` : "No finalised punch file for this week."}</p></div><LockKeyhole className="ml-auto h-4 w-4 text-muted-foreground"/></section>
    </WorkspaceGrid>
  </>;
}
