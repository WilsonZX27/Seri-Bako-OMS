import Link from "next/link";
import { AttendanceImportWorkflow } from "@/components/attendance/attendance-import-workflow";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { MappingAdmin } from "@/components/attendance/mapping-admin";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { durationLabel } from "@/lib/attendance/calculation";
import { getAttendanceMappings, getAttendanceReconciliation } from "@/server/queries/attendance";
import { hasPermission } from "@/server/auth/permissions";
import { redirect } from "next/navigation";

export default async function AttendanceImportsPage() {
  if (!(await hasPermission("attendance.import"))) redirect("/attendance");
  const [mappings, reconciliation] = await Promise.all([getAttendanceMappings(), getAttendanceReconciliation()]);
  const people = mappings.people as Array<Record<string, unknown>>;
  const devices = mappings.devices as Array<Record<string, unknown>>;
  return <>
    <PageHeader title="NGTeco Import" description="Match people and devices, preview raw punches, then calculate against the published schedule." contentWidth="wide" />
    <WorkspaceGrid tabletCanvas="wide" className="sb-portrait-tablet-rail" hideMobileConsole rightRail={<>
      <ConsoleSection title="Import order"><ol className="space-y-2"><li><strong>1. Match</strong><br/><span className="text-muted-foreground">Link Person ID or accept one exact staff-name match.</span></li><li><strong>2. Preview</strong><br/><span className="text-muted-foreground">Nothing is stored during preview.</span></li><li><strong>3. Confirm</strong><br/><span className="text-muted-foreground">Punches calculate against published times.</span></li></ol></ConsoleSection>
      <ConsoleSection title="Next"><Button asChild size="sm" variant="outline" className="w-full"><Link href="/attendance/review">Review calculated time</Link></Button></ConsoleSection>
    </>}>
      <AttendanceWorkspaceNav current="import" />
      {mappings.allowed ? <MappingAdmin staffs={mappings.staffs} branches={mappings.branches} people={people} devices={devices}/> : null}
      <AttendanceImportWorkflow staffs={mappings.staffs} mappedPersonIds={people.filter(row => row.is_active !== false).map(row => String(row.person_id))} mappedSources={devices.filter(row => row.is_active !== false).map(row => String(row.source_code))} canMap={mappings.allowed}/>
      {reconciliation.allowed ? <section className="sb-work-surface overflow-hidden"><div className="border-b border-[var(--sb-border-soft)] p-3"><h2 className="text-sm font-semibold">Attendance Report reconciliation</h2><p className="mt-1 text-xs text-muted-foreground">Comparison only. NGTeco totals never overwrite OMS calculations.</p></div><div className="overflow-auto"><table className="w-full min-w-[44rem] text-left text-xs"><thead><tr><th className="p-3">Employee</th><th className="p-3">Person ID</th><th className="p-3">NGTeco total</th><th className="p-3">OMS recognised</th><th className="p-3">Difference</th></tr></thead><tbody>{reconciliation.rows.map(row => <tr key={`${row.batch_id}-${row.person_id}`} className="border-t"><td className="p-3 font-medium">{String(row.staffName)}</td><td className="p-3 font-mono">{String(row.person_id)}</td><td className="p-3 tabular-nums">{durationLabel(Number(row.ngteco_total_seconds ?? row.ngteco_work_seconds ?? 0))}</td><td className="p-3 tabular-nums">{durationLabel(Number(row.omsSeconds))}</td><td className="p-3 tabular-nums">{durationLabel(Number(row.differenceSeconds))}</td></tr>)}</tbody></table>{!reconciliation.rows.length ? <p className="p-4 text-xs text-muted-foreground">No Attendance Report reconciliation has been uploaded for this week.</p> : null}</div></section> : null}
    </WorkspaceGrid>
  </>;
}
