import Link from "next/link";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { RequestDecisionButtons } from "@/components/attendance/request-review";
import { SchedulePlanner } from "@/components/attendance/schedule-planner";
import { TemplateAdmin } from "@/components/attendance/template-admin";
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
    <PageHeader title="Schedule Planner" description="Set each employee's check-in and check-out time, then submit the outlet week for Manager publication." />
    <WorkspaceGrid tabletCanvas="contained" className="sb-portrait-tablet-rail" hideMobileConsole rightRail={<>
      <ConsoleSection title="Workflow"><ol className="space-y-2"><li><strong>1. Build</strong><br/><span className="text-muted-foreground">Supervisor sets daily working times.</span></li><li><strong>2. Submit</strong><br/><span className="text-muted-foreground">Conflicts and missing OFF days are checked.</span></li><li><strong>3. Publish</strong><br/><span className="text-muted-foreground">Manager approval makes shifts visible to staff.</span></li></ol></ConsoleSection>
      <ConsoleSection title="Shortcuts"><Button asChild size="sm" variant="outline" className="w-full"><Link href="/attendance/imports">Import punches</Link></Button><Button asChild size="sm" variant="outline" className="w-full"><Link href="/attendance/review">Review actual time</Link></Button></ConsoleSection>
    </>}>
      <AttendanceWorkspaceNav current="schedule" />
      {requests.length ? <section className="sb-work-surface overflow-hidden"><div className="border-b p-3"><h2 className="text-sm font-semibold">Pending shift requests</h2></div><div className="divide-y">{requests.map((request: Record<string, unknown>) => { const assignment = request.shift_assignment_revisions as { work_date?: string; staffs?: { full_name?: string }; branches?: { branch_name?: string } } | null; return <div key={String(request.id)} className="flex flex-wrap items-center gap-3 p-3 text-xs"><span className="font-medium">{assignment?.staffs?.full_name ?? "Employee"}</span><span>{assignment?.work_date}</span><span className="text-muted-foreground">{assignment?.branches?.branch_name} · {String(request.reason)}</span><StatusBadge status={String(request.status)}/><span className="ml-auto"><RequestDecisionButtons requestId={String(request.id)}/></span></div>; })}</div></section> : null}
      {data.branchId ? <>{canManageTemplates ? <TemplateAdmin branchId={data.branchId}/> : null}<SchedulePlanner branches={data.branches} branchId={data.branchId} weekStart={weekStart} week={data.week} people={data.people} templates={data.templates} initialAssignments={data.assignments} canDraft={canDraft} canSubmit={canSubmit} canApprove={canApprove}/></> : <section className="sb-work-surface p-5"><h2 className="text-sm font-semibold">No accessible outlet</h2><p className="mt-1 text-xs text-muted-foreground">Assign this Supervisor or Manager to an outlet before building its schedule.</p></section>}
    </WorkspaceGrid>
  </>;
}
