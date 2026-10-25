import { PaginationControls } from "@/components/sortable-table";
import { randomUUID } from "node:crypto";
import { ConsoleSection } from "@/components/layout/right-console";
import { AssetMaintenanceUpdate } from "@/components/asset-maintenance-form";
import { AssetMaintenanceDetailPanel } from "@/components/asset-maintenance-detail-panel";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { getAssetDetail, getAssetMaintenanceDetail } from "@/server/queries/assets";
import { getPermissionMap } from "@/server/auth/permissions";

export default async function MaintenanceDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const query = await searchParams, page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const [data, permissions] = await Promise.all([getAssetMaintenanceDetail(id, page), getPermissionMap(["assets.maintenance", "assets.manage", "assets.report"])]);
  if (!data) notFound();
  const request = data.request;
  const asset = request.asset_id ? await getAssetDetail(request.asset_id) : null;
  return <><PageHeader title={asset?.asset.item_name ?? "Maintenance request"} /><WorkspaceGrid tabletRailMode="split" rightRail={<>
    <ConsoleSection title="Actions">{permissions["assets.maintenance"] ? <AssetMaintenanceUpdate requestKey={randomUUID()} requestId={id} status={request.status ?? "Open"} canManage={permissions["assets.manage"]}/> : <p className="text-xs text-muted-foreground">You have read-only access to this request.</p>}</ConsoleSection>
    <ConsoleSection title="Next Step"><p className="text-xs text-muted-foreground">Add a work note before saving an update. Attach repair photos in the attachments section.</p></ConsoleSection>
  </>}>
    <AssetMaintenanceDetailPanel hideUpdate data={data} asset={asset} permissions={permissions}/>
    {data.total > 50 ? <PaginationControls page={page} totalPages={Math.max(1, Math.ceil(data.total / 50))} totalRows={data.total} searchParams={{}} /> : null}
  </WorkspaceGrid></>;
}
