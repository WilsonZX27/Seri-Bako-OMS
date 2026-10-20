import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, CalendarDays, FileSpreadsheet, LockKeyhole, UsersRound } from "lucide-react";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { PublishedScheduleList } from "@/components/attendance/published-schedule-list";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getPermissionMap } from "@/server/auth/permissions";
import { getAttendanceWorkspace, getOwnPublishedShifts, malaysiaWeekStart } from "@/server/queries/attendance";
import { logServerError } from "@/server/observability/logger";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";

export default async function AttendancePage() {
  const actor = await requireActiveTenantActor();
  if (actor.roleCode === "kitchen") {
    const shifts = await getOwnPublishedShifts();
    return <>
      <PageHeader title="My Schedule" description="Your published shifts for the current week." contentWidth="wide" />
      <WorkspaceGrid tabletRailMode="split" hideMobileConsole rightRail={<ConsoleSection title="Schedule access"><p className="text-xs text-muted-foreground">This view contains only your own published shifts.</p></ConsoleSection>}>
        <PublishedScheduleList shifts={shifts} allowRequests={false} />
      </WorkspaceGrid>
    </>;
  }
  const permissions = await getPermissionMap(["attendance.read", "schedule.read", "attendance.review", "attendance.import"]);
  if (!permissions["attendance.read"]) {
    const shifts = await getOwnPublishedShifts();
    return <>
      <PageHeader title="My Schedule" description="Your published shifts for the current week." contentWidth="wide" />
      <WorkspaceGrid tabletRailMode="split" hideMobileConsole rightRail={<ConsoleSection title="Schedule access"><p className="text-xs text-muted-foreground">This view contains only your own published shifts.</p></ConsoleSection>}>
        <PublishedScheduleList shifts={shifts} allowRequests={false} />
      </WorkspaceGrid>
    </>;
  }
  const currentWeekStart = malaysiaWeekStart();
  const currentWeekEnd = new Date(`${currentWeekStart}T00:00:00Z`); currentWeekEnd.setUTCDate(currentWeekEnd.getUTCDate() + 6);
  const workspaceResult = await getAttendanceWorkspace().then((data) => ({ data, error: null })).catch((error: unknown) => ({ data: null, error }));
  if (workspaceResult.error) logServerError(workspaceResult.error, { source: "page.attendance.workspace" });
  const data = workspaceResult.data ?? {
    weekStart: currentWeekStart, weekEnd: currentWeekEnd.toISOString().slice(0, 10), pendingApprovals: 0, pendingRequests: 0,
    unresolvedExceptions: 0, pendingActualReports: 0, missingMappings: 0,
    scheduleStatus: "unavailable", latestBatch: null, activeLocks: 0,
  };
  const canSchedule = permissions["schedule.read"];
  const canReview = permissions["attendance.review"];
  const canImport = permissions["attendance.import"];
  const tasks = [
    ...(canSchedule?[{ label: "Schedule decisions", value: data.pendingApprovals+data.pendingRequests, detail:`${data.pendingApprovals} awaiting Manager · ${data.pendingRequests} staff requests`, icon: CalendarDays, href: "/attendance/schedule" }]:[]),
    ...(canReview?[{ label: "Attendance exceptions", value: data.unresolvedExceptions+data.pendingActualReports, detail:`${data.unresolvedExceptions} punch exceptions · ${data.pendingActualReports} daily reports`, icon: AlertTriangle, href: "/attendance/review" }]:[]),
    ...(canImport?[{ label: "Missing Person ID mappings", value: data.missingMappings, detail:"Map people before calculating attendance", icon: UsersRound, href: "/attendance/review?mapping=1" }]:[]),
  ];
  return <>
    <PageHeader title="Attendance" description="Your outlet schedule and the items that need attention this week." contentWidth="wide" />
    <WorkspaceGrid tabletCanvas="wide" className="sb-portrait-tablet-rail" hideMobileConsole rightRail={<>
      <ConsoleSection title="Actions">
        {canSchedule ? <Button asChild size="sm" className="w-full"><Link href="/attendance/schedule">Open Schedule Planner</Link></Button> : null}
        {canReview ? <Button asChild size="sm" variant="outline" className="w-full"><Link href="/attendance/review">Review attendance</Link></Button> : null}
        {canImport ? <Button asChild size="sm" variant="outline" className="w-full"><Link href="/attendance/review">Import NGTeco file</Link></Button> : null}
      </ConsoleSection>
      <ConsoleSection title="Current week"><p className="font-semibold">{data.weekStart} – {data.weekEnd}</p><StatusBadge status={data.scheduleStatus} /><p className="mt-1 text-xs text-muted-foreground">Schedules you can access</p></ConsoleSection>
      <ConsoleSection title="Period"><p>{data.activeLocks ? `${data.activeLocks} locked scope${data.activeLocks === 1 ? "" : "s"}` : "Open for scheduling and review"}</p></ConsoleSection>
    </>}>
      <AttendanceWorkspaceNav current="overview" />
      {workspaceResult.error ? <section className="sb-work-surface border border-[var(--sb-warning-border)] bg-[var(--sb-warning-bg)] p-3"><h2 className="text-sm font-semibold">Attendance summary is temporarily unavailable</h2><p className="mt-1 text-xs text-muted-foreground">Schedule and review tools remain available. Refresh shortly to reload the summary.</p></section> : null}
      <Suspense fallback={<section className="sb-work-surface p-3 text-sm text-muted-foreground" role="status">Loading your published schedule…</section>}><OwnPublishedSchedule /></Suspense>
      {tasks.length?<section className="sb-work-surface overflow-hidden"><div className="border-b px-3 py-2.5"><h2 className="text-sm font-semibold">Needs attention</h2></div><div className="divide-y">{tasks.map(({label,value,detail,icon:Icon,href})=><Link href={href} key={label} className="flex min-h-14 items-center gap-3 px-3 py-2 hover:bg-[var(--sb-surface-muted)]"><Icon className="h-4 w-4 shrink-0 text-[var(--sb-green-700)]"/><span className="min-w-0 flex-1"><strong className="block text-xs">{label}</strong><span className="block break-words text-xs leading-4 text-muted-foreground">{detail}</span></span><strong className="shrink-0 tabular-nums">{value}</strong></Link>)}</div></section>:null}
      <section className="sb-work-surface flex items-start gap-3 p-3"><FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sb-green-700)]"/><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">Latest NGTeco import</h2><p className="mt-1 break-words text-xs text-muted-foreground">{data.latestBatch ? `${data.latestBatch.file_name} · ${data.latestBatch.row_count} rows · ${data.latestBatch.status}` : "No finalised punch file for this week."}</p></div><LockKeyhole className="h-4 w-4 shrink-0 text-muted-foreground"/></section>
    </WorkspaceGrid>
  </>;
}

async function OwnPublishedSchedule() {
  const shifts = await getOwnPublishedShifts().catch((error: unknown) => {
    logServerError(error, { source: "page.attendance.own-shifts" });
    return [];
  });
  return <PublishedScheduleList shifts={shifts} />;
}
