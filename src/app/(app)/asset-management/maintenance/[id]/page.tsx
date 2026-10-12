import { AssetMaintenanceDetailPanel } from "@/components/asset-maintenance-detail-panel";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { Button } from "@/components/ui/button";
import { getAssetDetail, getAssetMaintenanceDetail } from "@/server/queries/assets";
import { getPermissionMap } from "@/server/auth/permissions";

export default async function MaintenanceDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const query = await searchParams, page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const [data, permissions] = await Promise.all([getAssetMaintenanceDetail(id, page), getPermissionMap(["assets.maintenance", "assets.manage"])]);
  if (!data) notFound();
  const request = data.request;
  const asset = await getAssetDetail(request.asset_id);
  const location = asset?.locations.find(row=>row.id===request.location_id);
  return <><PageHeader title={asset?.asset.item_name ?? "Maintenance request"} description={`${asset?.asset.asset_code ?? ""} · ${request.source_id ?? "Maintenance request"}`}/><WorkspaceGrid rightRail={<><ConsoleSection title="Request status" kind="status"><p className="font-semibold">{request.status ?? "Unknown"} · {request.priority ?? "Priority not recorded"}</p><p>{location?.source_name ?? "Location not recorded"}</p><p>Reported by {request.author_name ?? "Unknown"}</p><Button asChild variant="outline"><Link href={`/asset-management/assets/${request.asset_id}`}>View asset</Link></Button></ConsoleSection><ConsoleSection title="Next step"><p>Review the problem, describe the work performed and save an update. Each update is kept in the request history.</p></ConsoleSection></>}>
    <AssetMaintenanceDetailPanel data={data} asset={asset} permissions={permissions}/>
    {data.total > 50 ? <nav className="flex justify-between text-sm" aria-label="Maintenance history pages">{page > 1 ? <Link className="min-h-11 py-3 underline" href={`?page=${page - 1}`}>Previous</Link> : <span/>}{page * 50 < data.total ? <Link className="min-h-11 py-3 underline" href={`?page=${page + 1}`}>Next</Link> : null}</nav> : null}
  </WorkspaceGrid></>;
}
