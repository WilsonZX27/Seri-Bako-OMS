import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { redirect } from "next/navigation";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { TemplateAdmin } from "@/components/attendance/template-admin";
import { MappingAdmin } from "@/components/attendance/mapping-admin";
import { HolidayAdmin } from "@/components/attendance/holiday-admin";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { hasPermission } from "@/server/auth/permissions";
import { getAttendanceMappings, getAttendancePaySettings, getSchedulePlanner } from "@/server/queries/attendance";

export default async function AttendanceSettingsPage() {
  const [canManageTemplates, canMap] = await Promise.all([hasPermission("shift_template.manage"), hasPermission("attendance.map")]);
  if (!canManageTemplates && !canMap) redirect("/attendance");
  const [data, mappings, paySettings] = await Promise.all([getSchedulePlanner(), canMap ? getAttendanceMappings() : Promise.resolve(null), getAttendancePaySettings()]);
  const rightRail = <>
    <ConsoleSection title="Related work" kind="action"><div className="grid gap-2"><Button asChild size="sm"><Link href="/attendance/schedule">Open schedule</Link></Button><Button asChild size="sm" variant="outline"><Link href="/attendance/review">Review attendance</Link></Button></div></ConsoleSection>
    <ConsoleSection title="Template scope" kind="status"><p><strong>{data.templates.length}</strong> active shift templates</p><p className="text-muted-foreground">Changes apply when a supervisor next assigns that shift.</p></ConsoleSection>
  </>;
  return <><PageHeader title="Attendance Settings" description="Manage attendance sources and the rules used by schedules and weekly review." contentWidth="wide"/><WorkspaceGrid tabletCanvas="wide" hideMobileConsole rightRail={rightRail}><AttendanceWorkspaceNav current="settings"/>{mappings?.allowed ? <section className="sb-work-surface overflow-hidden"><MappingAdmin branches={mappings.branches} devices={mappings.devices as Array<Record<string, unknown>>}/></section> : null}{canManageTemplates?<details className="group sb-work-surface overflow-hidden"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">Public holidays & payroll rules<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180"/></summary><div className="border-t border-[var(--sb-border-soft)]"><HolidayAdmin rules={paySettings.rules as Array<Record<string,unknown>>} holidays={paySettings.holidays as Array<Record<string,unknown>>} branches={paySettings.branches as Array<Record<string,unknown>>}/></div></details>:null}{canManageTemplates ? data.branchId ? <details className="group sb-work-surface overflow-hidden"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">Shift templates<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180"/></summary><div className="border-t border-[var(--sb-border-soft)]"><TemplateAdmin branchId={data.branchId}/></div></details> : <p className="text-sm">No accessible outlet.</p> : null}</WorkspaceGrid></>;
}
