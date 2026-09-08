import Link from "next/link";
import { AlertTriangle, CalendarDays, FileSpreadsheet, LockKeyhole, UsersRound } from "lucide-react";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { PublishedScheduleList } from "@/components/attendance/published-schedule-list";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getPermissionMap } from "@/server/auth/permissions";
import { getAttendanceWorkspace, getOwnPublishedShifts } from "@/server/queries/attendance";

export default async function AttendancePage() {
  const [data, ownShifts, permissions] = await Promise.all([getAttendanceWorkspace(), getOwnPublishedShifts(), getPermissionMap(["schedule.read", "attendance.review", "attendance.import"])]);
  const canSchedule = permissions["schedule.read"];
  const canReview = permissions["attendance.review"];
  const canImport = permissions["attendance.import"];
  const tasks = [
    ...(canSchedule?[{ label: "Schedule decisions", value: data.pendingApprovals+data.pendingRequests, detail:`${data.pendingApprovals} awaiting Manager · ${data.pendingRequests} staff requests`, icon: CalendarDays, href: "/attendance/schedule" }]:[]),
    ...(canReview?[{ label: "Attendance exceptions", value: data.unresolvedExceptions+data.pendingActualReports, detail:`${data.unresolvedExceptions} punch exceptions · ${data.pendingActualReports} daily reports`, icon: AlertTriangle, href: "/attendance/review" }]:[]),
    ...(canImport?[{ label: "Missing Person ID mappings", value: data.missingMappings, detail:"Map people before calculating attendance", icon: UsersRound, href: "/attendance/review" }]:[]),
  ];
  return <>
    <PageHeader title="Attendance" description="Your outlet schedule and the items that need attention this week." contentWidth="wide" />
    <WorkspaceGrid tabletCanvas="wide" className="sb-portrait-tablet-rail" hideMobileConsole rightRail={<>
      <ConsoleSection title="Actions">
        {canSchedule ? <Button asChild size="sm" className="w-full"><Link href="/attendance/schedule">Open Schedule Planner</Link></Button> : null}
        {canReview ? <Button asChild size="sm" variant="outline" className="w-full"><Link href="/attendance/review">Review attendance</Link></Button> : null}
        {canImport ? <Button asChild size="sm" variant="outline" className="w-full"><Link href="/attendance/review">Import NGTeco file</Link></Button> : null}
      </ConsoleSection>
      <ConsoleSection title="Current week"><p className="font-semibold">{data.weekStart} – {data.weekEnd}</p><StatusBadge status={data.scheduleStatus} /></ConsoleSection>
      <ConsoleSection title="Period"><p>{data.activeLocks ? `${data.activeLocks} locked scope${data.activeLocks === 1 ? "" : "s"}` : "Open for scheduling and review"}</p></ConsoleSection>
    </>}>
      <AttendanceWorkspaceNav current="overview" />
      <PublishedScheduleList shifts={ownShifts} />
      {tasks.length?<section className="sb-work-surface overflow-hidden"><div className="border-b px-3 py-2.5"><h2 className="text-sm font-semibold">Needs attention</h2></div><div className="divide-y">{tasks.map(({label,value,detail,icon:Icon,href})=><Link href={href} key={label} className="flex min-h-14 items-center gap-3 px-3 py-2 hover:bg-[var(--sb-surface-muted)]"><Icon className="h-4 w-4 text-[var(--sb-green-700)]"/><span className="min-w-0 flex-1"><strong className="block text-xs">{label}</strong><span className="block truncate text-xs text-muted-foreground">{detail}</span></span><strong className="tabular-nums">{value}</strong></Link>)}</div></section>:null}
      <section className="sb-work-surface flex items-start gap-3 p-3"><FileSpreadsheet className="mt-0.5 h-4 w-4 text-[var(--sb-green-700)]"/><div><h2 className="text-sm font-semibold">Latest NGTeco import</h2><p className="mt-1 text-xs text-muted-foreground">{data.latestBatch ? `${data.latestBatch.file_name} · ${data.latestBatch.row_count} rows · ${data.latestBatch.status}` : "No finalised punch file for this week."}</p></div><LockKeyhole className="ml-auto h-4 w-4 text-muted-foreground"/></section>
    </WorkspaceGrid>
  </>;
}
