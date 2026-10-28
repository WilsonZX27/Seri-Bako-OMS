import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceCanvas } from "@/components/layout/workspace-layout";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { FixedAttendanceRepair } from "@/components/attendance/fixed-attendance-repair";

export default async function ControlledAttendanceRepairPage(){
  const actor=await requireActiveTenantActor();
  if(actor.companyId!=="3b104582-f8cb-4a4d-867f-b99e5ffc6486"||(!(await hasPermission("attendance.import"))&&!(await hasPermission("attendance.adjust"))))notFound();
  return <><PageHeader title="Controlled attendance repair" backHref="/attendance/review" description="One approved, fixed attendance scope."/><WorkspaceCanvas><FixedAttendanceRepair/></WorkspaceCanvas></>;
}
