import Link from "next/link";
import { ComplianceMonthCalendar } from "@/components/compliance-month-calendar";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getOutletComplianceWorkspace } from "@/server/queries/compliance";

export default async function OutletCalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const [{ month }, workspace] = await Promise.all([searchParams, getOutletComplianceWorkspace()]);
  const branchById = new Map(workspace.branches.map((row) => [row.id, row]));
  const typeById = new Map(workspace.requirements.map((row) => [row.compliance_type_id, row.type?.type_name]));
  const events = workspace.records.filter((row) => row.expires_on && row.branch_id).map((event) => ({ id: event.id, date: event.expires_on!, title: typeById.get(event.compliance_type_id) ?? event.subject_label, context: branchById.get(event.branch_id!)?.branch_name ?? "Outlet", href: `/outlet-compliance/${event.branch_id}`, state: event.state }));
  const urgent = events.filter((event) => ["expired", "due_7", "due_30"].includes(event.state)).length;
  const rightRail = <>
    <ConsoleSection title="Actions" kind="action"><Button asChild size="sm" className="w-full"><Link href="/outlet-compliance">Open outlet register</Link></Button></ConsoleSection>
    <ConsoleSection title="Calendar" kind="status"><p><strong>{events.length}</strong> dated requirements</p><p><strong>{urgent}</strong> due soon or expired</p></ConsoleSection>
  </>;
  return <><PageHeader title="Outlet Calendar" description="Expiry and renewal dates by outlet." contentWidth="wide"/><WorkspaceGrid tabletCanvas="wide" rightRail={rightRail}><ComplianceMonthCalendar baseHref="/outlet-calendar" month={month} events={events}/></WorkspaceGrid></>;
}
