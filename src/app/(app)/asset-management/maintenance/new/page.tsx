import { randomUUID } from "node:crypto";
import { PageHeader } from "@/components/ui/page-header";
import { GeneralMaintenanceForm } from "@/components/general-maintenance-form";
import { getMaintenanceReportOptions } from "@/server/queries/assets";
import { getCurrentProfile } from "@/server/queries/common";
import { hasPermission, requirePermission } from "@/server/auth/permissions";

export default async function ReportProblem({searchParams}:{searchParams:Promise<{location?:string;asset?:string}>}) {
  await requirePermission(await hasPermission("assets.report") ? "assets.report" : "assets.maintenance");
  const [data,profile,query]=await Promise.all([getMaintenanceReportOptions(),getCurrentProfile(),searchParams]);
  const initialLocation=data.locations.find(row=>row.id===query.location)?.id ?? data.locations.find(row=>row.branch_id===(profile && "default_branch_id" in profile ? profile.default_branch_id : null))?.id ?? (data.locations.length===1 ? data.locations[0].id : "");
  const initialAsset=data.choices.find(row=>row.id===query.asset && row.locationId===initialLocation)?.id ?? "";
  return <div className="mx-auto w-full max-w-xl space-y-4"><PageHeader title="Report a problem"/><section className="sb-work-surface p-4 sm:p-5"><GeneralMaintenanceForm {...data} initialLocation={initialLocation} initialAsset={initialAsset} requestKey={randomUUID()} photoKey={randomUUID()}/></section></div>;
}
