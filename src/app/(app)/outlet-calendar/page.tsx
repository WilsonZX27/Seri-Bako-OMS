import Link from "next/link";
import { ComplianceMonthCalendar } from "@/components/compliance-month-calendar";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getOutletComplianceWorkspace } from "@/server/queries/compliance";

export default async function OutletCalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; branch?: string }> }) {
  const [{ month, branch: rawBranch }, workspace] = await Promise.all([searchParams, getOutletComplianceWorkspace()]);
  const branch = rawBranch === "all" ? undefined : rawBranch;
  const branchById = new Map(workspace.branches.map((row) => [row.id, row]));
  const events = workspace.records.filter((row) => row.expires_on && row.branch_id && (!branch || row.branch_id === branch)).map((event) => ({ id: event.id, date: event.expires_on!, title: event.type_name, context: branchById.get(event.branch_id!)?.branch_name ?? "Outlet", href: `/outlet-compliance/${event.branch_id}`, state: event.state }));
  const urgent = events.filter((event) => ["expired", "due_7", "due_30"].includes(event.state)).length;
  const urgentEvents = events.filter((event) => ["expired", "due_7", "due_30"].includes(event.state)).sort((a, b) => a.date.localeCompare(b.date));
  const rightRail = <>
    <ConsoleSection title="Actions" kind="action"><Button asChild size="sm" className="w-full"><Link href="/outlet-compliance">Open Outlet Compliance</Link></Button></ConsoleSection>
    <ConsoleSection title="Calendar" kind="status"><p><strong>{events.length}</strong> dated requirements</p><p><strong>{urgent}</strong> due soon or expired</p></ConsoleSection>
    <ConsoleSection title="Due soon & expired" kind="danger" className="bg-[#f9e6e6]">
      <div className="divide-y divide-[var(--sb-border-soft)]">
        {urgentEvents.map((event) => <Link key={event.id} href={event.href} className="block py-2 first:pt-0 last:pb-0 hover:text-[var(--sb-green-800)]"><time className="block text-[11px] font-semibold tabular-nums">{event.date}</time><span className="mt-0.5 block text-xs font-medium">{event.title}</span><span className="block text-[11px] text-muted-foreground">{event.context}</span></Link>)}
        {!urgentEvents.length ? <p className="text-xs text-muted-foreground">No due or expired requirements.</p> : null}
      </div>
    </ConsoleSection>
  </>;
  const urgentList = <div className="divide-y divide-[var(--sb-border-soft)]">{urgentEvents.map((event) => <Link key={event.id} href={event.href} className="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-3 py-2.5 first:pt-0 last:pb-0 hover:text-[var(--sb-green-800)]"><time className="text-[11px] font-semibold tabular-nums">{event.date}</time><span className="min-w-0"><span className="block truncate text-xs font-medium">{event.title}</span><span className="block truncate text-[11px] text-muted-foreground">{event.context}</span></span></Link>)}{!urgentEvents.length ? <p className="text-xs text-muted-foreground">No due or expired requirements.</p> : null}</div>;
  return <><PageHeader title="Outlet Calendar" description="Expiry and renewal dates by outlet." contentWidth="wide"/><WorkspaceGrid tabletCanvas="wide" hideMobileConsole rightRail={rightRail}><div className="space-y-3"><ComplianceMonthCalendar baseHref={branch?`/outlet-calendar?branch=${encodeURIComponent(branch)}`:"/outlet-calendar"} month={month} events={events}/><section className="sb-work-surface bg-[#ffe5e5] p-4 md:hidden" aria-labelledby="mobile-urgent-compliance"><h2 id="mobile-urgent-compliance" className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-text-muted)]">Due soon &amp; expired</h2>{urgentList}</section></div></WorkspaceGrid></>;
}
