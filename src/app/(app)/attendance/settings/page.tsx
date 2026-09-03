import Link from "next/link";
import { redirect } from "next/navigation";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { TemplateAdmin } from "@/components/attendance/template-admin";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { hasPermission } from "@/server/auth/permissions";
import { getSchedulePlanner } from "@/server/queries/attendance";

export default async function AttendanceSettingsPage() {
  if (!(await hasPermission("shift_template.manage"))) redirect("/attendance");
  const data = await getSchedulePlanner();
  const rightRail = <>
    <ConsoleSection title="Related work" kind="action"><div className="grid gap-2"><Button asChild size="sm"><Link href="/attendance/schedule">Open schedule</Link></Button><Button asChild size="sm" variant="outline"><Link href="/attendance/review">Review attendance</Link></Button></div></ConsoleSection>
    <ConsoleSection title="Template scope" kind="status"><p><strong>{data.templates.length}</strong> active shift templates</p><p className="text-muted-foreground">Changes apply when a supervisor next assigns that shift.</p></ConsoleSection>
  </>;
  return <><PageHeader title="Attendance Settings" description="Define reusable shifts, punch windows, recognised time and approved OT rules." contentWidth="wide"/><WorkspaceGrid tabletCanvas="wide" rightRail={rightRail}><AttendanceWorkspaceNav current="settings"/>{data.branchId ? <TemplateAdmin branchId={data.branchId}/> : <p className="text-sm">No accessible outlet.</p>}</WorkspaceGrid></>;
}
