import Link from "next/link";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { RequestDecisionButtons } from "@/components/attendance/request-review";
import { SchedulePlanner } from "@/components/attendance/schedule-planner";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { hasPermission } from "@/server/auth/permissions";
import { getPendingShiftRequests, getSchedulePlanner, malaysiaWeekStart } from "@/server/queries/attendance";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ branch?: string; week?: string }> }) {
  const params = await searchParams;
  const weekStart = /^\d{4}-\d{2}-\d{2}$/.test(params.week ?? "") ? params.week! : malaysiaWeekStart();
  const [data, requests, canDraft, canSubmit, canApprove, canManageTemplates] = await Promise.all([getSchedulePlanner(weekStart, params.branch), getPendingShiftRequests(), hasPermission("schedule.draft"), hasPermission("schedule.submit"), hasPermission("schedule.approve"), hasPermission("shift_template.manage")]);
  return <>
    <PageHeader title="Outlet Schedule" description="Select staff days, assign a shift or leave type, then send the week to a Manager." />
    <WorkspaceGrid tabletCanvas="contained" className="sb-portrait-tablet-rail" hideMobileConsole rightRail={<>
      <ConsoleSection title="Next step"><p className="text-xs text-muted-foreground">Save freely while planning. Send to Manager only when the week is complete.</p></ConsoleSection>
      <ConsoleSection title="Tools">{canManageTemplates?<Button asChild size="sm" variant="outline" className="w-full"><Link href="/attendance/settings">Shift & attendance settings</Link></Button>:null}<Button asChild size="sm" variant="outline" className="w-full"><Link href="/attendance/review">Review actual time</Link></Button></ConsoleSection>
    </>}>
      <AttendanceWorkspaceNav current="schedule" />
      {requests.length ? <section className="sb-work-surface overflow-hidden"><div className="border-b p-3"><h2 className="text-sm font-semibold">Pending shift requests</h2></div><div className="divide-y">{requests.map((request: Record<string, unknown>) => { const assignment = request.shift_assignment_revisions as { work_date?: string; staffs?: { full_name?: string }; branches?: { branch_name?: string } } | null; return <div key={String(request.id)} className="flex flex-wrap items-center gap-3 p-3 text-xs"><span className="font-medium">{assignment?.staffs?.full_name ?? "Employee"}</span><span>{assignment?.work_date}</span><span className="text-muted-foreground">{assignment?.branches?.branch_name} · {String(request.reason)}</span><StatusBadge status={String(request.status)}/><span className="ml-auto"><RequestDecisionButtons requestId={String(request.id)}/></span></div>; })}</div></section> : null}
      {data.branchId ? <SchedulePlanner branches={data.branches} branchId={data.branchId} weekStart={weekStart} week={data.week} previousWeekId={data.previousWeekId} people={data.people} templates={data.templates} initialAssignments={data.assignments} canDraft={canDraft} canSubmit={canSubmit} canApprove={canApprove}/> : <section className="sb-work-surface p-5"><h2 className="text-sm font-semibold">No accessible outlet</h2><p className="mt-1 text-xs text-muted-foreground">Assign this Supervisor or Manager to an outlet before building its schedule.</p></section>}
    </WorkspaceGrid>
  </>;
}
