import { AssetMaintenanceDetailPanel } from "@/components/asset-maintenance-detail-panel";
import Link from "next/link";
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
  return <><PageHeader title={asset?.asset.item_name ?? "Maintenance request"} /><WorkspaceGrid hideDesktopConsole hideMobileConsole>
    <AssetMaintenanceDetailPanel data={data} asset={asset} permissions={permissions}/>
    {data.total > 50 ? <nav className="flex justify-between text-sm" aria-label="Maintenance history pages">{page > 1 ? <Link className="min-h-11 py-3 underline" href={`?page=${page - 1}`}>Previous</Link> : <span/>}{page * 50 < data.total ? <Link className="min-h-11 py-3 underline" href={`?page=${page + 1}`}>Next</Link> : null}</nav> : null}
  </WorkspaceGrid></>;
}
