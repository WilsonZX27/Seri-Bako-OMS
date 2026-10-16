import Link from "next/link";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { RequestDecisionButtons } from "@/components/attendance/request-review";
import { SchedulePlanner } from "@/components/attendance/schedule-planner";
import { ScheduleWorkbookImport } from "@/components/attendance/schedule-workbook-import";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getPermissionMap } from "@/server/auth/permissions";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { getPendingShiftRequests, getScheduleOverview, getSchedulePlanner, getScheduleValidation, malaysiaWeekStart } from "@/server/queries/attendance";

const shiftWeek = (weekStart: string, days: number) => {
  const date = new Date(`${weekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
  };

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ branch?: string; week?: string; view?: string }> }) {
  const params = await searchParams;
  const weekStart = /^\d{4}-\d{2}-\d{2}$/.test(params.week ?? "") ? params.week! : malaysiaWeekStart();
  const overviewMode = params.view === "overview";
  const [data, overview, requests, permissions, actor] = await Promise.all([
    overviewMode ? Promise.resolve(null) : getSchedulePlanner(weekStart, params.branch),
    overviewMode ? getScheduleOverview(weekStart) : Promise.resolve([]),
    getPendingShiftRequests(),
    getPermissionMap(["schedule.draft", "schedule.submit", "schedule.approve", "attendance.import", "shift_template.manage"]),
    requireActiveTenantActor(),
  ]);
  const canDraft = permissions["schedule.draft"];
  const canSubmit = permissions["schedule.submit"] && ["outlet_supervisor", "manager", "super_admin"].includes(actor.roleCode);
  const canApprove = permissions["schedule.approve"];
  const canImport = permissions["attendance.import"];
  const canManageTemplates = permissions["shift_template.manage"];
  const validation=canSubmit&&data?.week&&["draft","returned","rejected","amendment_pending"].includes(data.week.status)?await getScheduleValidation(data.week.id):{status:"ready",blockers:[],warnings:[]};
  const requestPanel = requests.length ? <section className="sb-work-surface overflow-hidden"><div className="border-b p-3"><h2 className="text-sm font-semibold">Pending shift requests</h2></div><div className="divide-y">{requests.map((request: Record<string, unknown>) => { const assignment = request.shift_assignment_revisions as { work_date?: string; staffs?: { full_name?: string }; branches?: { branch_name?: string } } | null; return <div key={String(request.id)} className="flex flex-wrap items-center gap-3 p-3 text-xs"><span className="font-medium">{assignment?.staffs?.full_name ?? "Employee"}</span><span>{assignment?.work_date}</span><span className="text-muted-foreground">{assignment?.branches?.branch_name} · {String(request.reason)}</span><StatusBadge status={String(request.status)}/><span className="ml-auto"><RequestDecisionButtons requestId={String(request.id)}/></span></div>; })}</div></section> : null;
  const rightRail = <><ConsoleSection title="This week" kind="status">{data ? <dl className="divide-y divide-[var(--sb-border-soft)]"><div className="flex items-center justify-between gap-3 pb-2"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={data.week?.status??"not_started"}/></dd></div><div className="flex items-center justify-between gap-3 pt-2"><dt className="text-muted-foreground">Outlet team</dt><dd className="font-semibold tabular-nums">{data.people.length}</dd></div></dl> : <p className="text-xs text-muted-foreground">{overview.length} accessible outlets. Open a roster to view its team and workflow.</p>}</ConsoleSection><ConsoleSection title="Attendance tools" kind="reference">{canManageTemplates?<Button asChild size="sm" variant="outline" className="w-full"><Link href="/attendance/settings">Shift settings</Link></Button>:null}<Button asChild size="sm" variant="outline" className="w-full"><Link href="/attendance/review">{canImport?"Import or review actual time":"Review actual time"}</Link></Button></ConsoleSection></>;
  const dutyNotes=data?.untimedDuties.length?<details className="sb-work-surface p-3 text-xs"><summary className="cursor-pointer font-semibold">Fingerprint-exempt roster notes · {data.untimedDuties.length}</summary><p className="mt-2 text-muted-foreground">Named duties are recorded without assumed start/end times or paid hours.</p>{data.untimedDuties.map(note=><p key={`${note.staff_id}:${note.work_date}:${note.label}`} className="mt-2">{data.people.find(person=>person.id===note.staff_id)?.full_name??"Employee"} · {note.work_date} · {note.label}</p>)}</details>:null;
  const importPanel = <ScheduleWorkbookImport weekStart={weekStart} canDraft={canDraft}/>;
  return <>
    <PageHeader title="Outlet Schedule" description={overviewMode ? "See every outlet's weekly coverage and approval state before opening a roster." : canApprove&&canDraft ? "Select staff days, assign shifts or leave, then submit and publish the week." : "Select staff days, assign a shift or leave type, then send the week to a Manager."} contentWidth="wide" />
    {overviewMode ? <div className="sb-workspace-canvas min-h-0 space-y-3"><AttendanceWorkspaceNav current="schedule" />{importPanel}{dutyNotes}{requestPanel}<WorkspaceGrid tabletCanvas="wide" className="sb-portrait-tablet-rail" hideMobileConsole rightRail={rightRail}><section className="sb-work-surface overflow-hidden" aria-labelledby="schedule-overview-title" data-schedule-overview>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sb-border-soft)] p-3">
          <div><h2 id="schedule-overview-title" className="text-sm font-semibold">All outlets · weekly overview</h2><p className="mt-0.5 text-xs text-muted-foreground">A planning control board; open an outlet only when it needs work.</p></div>
          <div className="flex items-center gap-1 rounded-[var(--sb-radius-control)] border bg-white"><Button asChild size="sm" variant="ghost"><Link href={`/attendance/schedule?view=overview&week=${shiftWeek(weekStart, -7)}`} aria-label="Previous week">←</Link></Button><span className="min-w-40 text-center text-xs font-semibold tabular-nums">{weekStart} – {shiftWeek(weekStart, 6)}</span><Button asChild size="sm" variant="ghost"><Link href={`/attendance/schedule?view=overview&week=${shiftWeek(weekStart, 7)}`} aria-label="Next week">→</Link></Button></div>
        </div>
        <div className="divide-y divide-[var(--sb-border-soft)]">
          {overview.map((outlet) => <Link key={outlet.branchId} href={`/attendance/schedule?branch=${encodeURIComponent(outlet.branchId)}&week=${weekStart}`} className="grid min-h-16 gap-2 px-3 py-3 transition-colors hover:bg-[var(--sb-surface-muted)] sm:grid-cols-[minmax(12rem,1fr)_9rem_8rem_8rem] sm:items-center">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{outlet.branchName}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{outlet.status === "not_started" ? "No roster has been created" : "Open roster details"}</p></div>
            <div><span className="sm:hidden text-[10px] text-muted-foreground">Workflow · </span><StatusBadge status={outlet.status}/></div>
            <p className="text-xs"><span className="text-muted-foreground">People </span><strong className="tabular-nums">{outlet.assignedPeople}</strong></p>
            <p className="text-xs"><span className="text-muted-foreground">Shift days </span><strong className="tabular-nums">{outlet.assignedDays}/7</strong></p>
          </Link>)}
          {!overview.length ? <div className="p-5"><h3 className="text-sm font-semibold">No accessible outlets</h3><p className="mt-1 text-xs text-muted-foreground">Outlet schedules will appear after branch access is assigned.</p></div> : null}
        </div>
      </section></WorkspaceGrid></div> : data?.branchId ? <SchedulePlanner branches={data.branches} branchId={data.branchId} weekStart={weekStart} week={data.week} submittedByName={data.submittedByName} importSource={data.importSource} previousWeekId={data.previousWeekId} people={data.people} candidates={data.candidates} templates={data.templates} initialAssignments={data.assignments} externalAssignments={data.externalAssignments} roBalances={data.roBalances} canDraft={canDraft} canSubmit={canSubmit} canApprove={canApprove} initialWarnings={validation.warnings} initialBlockers={validation.blockers} rightRailDetails={rightRail} headerContent={<><AttendanceWorkspaceNav current="schedule"/>{importPanel}{dutyNotes}{requestPanel}</>}/> : <div className="sb-workspace-canvas min-h-0 space-y-3"><AttendanceWorkspaceNav current="schedule"/>{importPanel}<section className="sb-work-surface p-5"><h2 className="text-sm font-semibold">No accessible outlet</h2><p className="mt-1 text-xs text-muted-foreground">Assign this Supervisor or Manager to an outlet before building its schedule.</p></section></div>}
  </>;
}
