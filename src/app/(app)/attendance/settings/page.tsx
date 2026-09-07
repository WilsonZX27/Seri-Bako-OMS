import Link from "next/link";
import { redirect } from "next/navigation";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { TemplateAdmin } from "@/components/attendance/template-admin";
import { MappingAdmin } from "@/components/attendance/mapping-admin";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { hasPermission } from "@/server/auth/permissions";
import { getAttendanceMappings, getSchedulePlanner } from "@/server/queries/attendance";

export default async function AttendanceSettingsPage() {
  const [canManageTemplates, canMap] = await Promise.all([hasPermission("shift_template.manage"), hasPermission("attendance.map")]);
  if (!canManageTemplates && !canMap) redirect("/attendance");
  const [data, mappings] = await Promise.all([getSchedulePlanner(), canMap ? getAttendanceMappings() : Promise.resolve(null)]);
  const rightRail = <>
    <ConsoleSection title="Related work" kind="action"><div className="grid gap-2"><Button asChild size="sm"><Link href="/attendance/schedule">Open schedule</Link></Button><Button asChild size="sm" variant="outline"><Link href="/attendance/review">Review attendance</Link></Button></div></ConsoleSection>
    <ConsoleSection title="Template scope" kind="status"><p><strong>{data.templates.length}</strong> active shift templates</p><p className="text-muted-foreground">Changes apply when a supervisor next assigns that shift.</p></ConsoleSection>
  </>;
  return <><PageHeader title="Attendance Settings" description="Manage shift rules and attendance source mappings." contentWidth="wide"/><WorkspaceGrid tabletCanvas="wide" hideMobileConsole rightRail={rightRail}><AttendanceWorkspaceNav current="settings"/>{canManageTemplates ? data.branchId ? <TemplateAdmin branchId={data.branchId}/> : <p className="text-sm">No accessible outlet.</p> : null}{mappings?.allowed ? <details className="sb-work-surface overflow-hidden"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold">NGTeco device mappings</summary><div className="border-t border-[var(--sb-border-soft)]"><MappingAdmin branches={mappings.branches} devices={mappings.devices as Array<Record<string, unknown>>}/></div></details> : null}</WorkspaceGrid></>;
}
