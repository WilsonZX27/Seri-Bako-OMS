import Link from "next/link";
import { ComplianceMonthCalendar } from "@/components/compliance-month-calendar";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SelectControl } from "@/components/ui/select-control";
import { getOutletComplianceWorkspace } from "@/server/queries/compliance";

export default async function OutletCalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; branch?: string }> }) {
  const [{ month, branch: rawBranch }, workspace] = await Promise.all([searchParams, getOutletComplianceWorkspace()]);
  const branch = rawBranch === "all" ? undefined : rawBranch;
  const branchById = new Map(workspace.branches.map((row) => [row.id, row]));
  const events = workspace.records.filter((row) => row.expires_on && row.branch_id && (!branch || row.branch_id === branch)).map((event) => ({ id: event.id, date: event.expires_on!, title: event.type_name, context: branchById.get(event.branch_id!)?.branch_name ?? "Outlet", href: `/outlet-compliance/${event.branch_id}`, state: event.state }));
  const urgent = events.filter((event) => ["expired", "due_7", "due_30"].includes(event.state)).length;
  const rightRail = <>
    <ConsoleSection title="Actions" kind="action"><Button asChild size="sm" className="w-full"><Link href="/outlet-compliance">Open Outlet Compliance</Link></Button></ConsoleSection>
    <ConsoleSection title="Calendar" kind="status"><p><strong>{events.length}</strong> dated requirements</p><p><strong>{urgent}</strong> due soon or expired</p></ConsoleSection>
  </>;
  return <><PageHeader title="Outlet Calendar" description="Expiry and renewal dates by outlet." contentWidth="wide"/><WorkspaceGrid tabletCanvas="wide" hideMobileConsole rightRail={rightRail}><form className="sb-work-surface flex flex-wrap items-end gap-2 p-3"><label className="grid min-w-56 gap-1 text-xs font-medium">Outlet<SelectControl name="branch" ariaLabel="Outlet" searchable defaultValue={branch??"all"} options={[{value:"all",label:"All accessible outlets"},...workspace.branches.map((outlet)=>({value:outlet.id,label:outlet.branch_name}))]}/></label><Button type="submit" size="sm" variant="outline">Apply</Button></form><ComplianceMonthCalendar baseHref={branch?`/outlet-calendar?branch=${encodeURIComponent(branch)}`:"/outlet-calendar"} month={month} events={events}/></WorkspaceGrid></>;
}
