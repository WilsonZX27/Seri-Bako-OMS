import { formatDateOnly } from "@/lib/utils";
import { randomUUID } from "node:crypto";
import { AssetAttachmentList } from "@/components/asset-attachment-list";
import { AssetAttachmentForm } from "@/components/asset-attachment-form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { AssetMaintenanceUpdate } from "@/components/asset-maintenance-form";
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
    <section className="sb-work-surface p-4"><div className="mb-3 lg:hidden"><h2 className="text-base font-semibold">{asset?.asset.item_name ?? "Maintenance request"}</h2><p className="mt-1 break-words text-xs text-muted-foreground">{asset?.asset.asset_code} · {request.source_id}</p><p className="mt-2 text-sm font-medium">{request.status ?? "Unknown"} · {request.priority ?? "Priority not recorded"}</p></div><h2 className="mb-2 text-sm font-semibold">Reported problem</h2><p className="whitespace-pre-wrap text-base">{request.description ?? "No description recorded."}</p><p className="mt-2 text-sm text-muted-foreground">{location?.source_name ?? "Location not recorded"} · Reported by {request.author_name ?? "Unknown"}</p><Link className="block min-h-11 py-3 text-sm underline" href={`/asset-management/assets/${request.asset_id}`}>Open asset</Link>{permissions["assets.maintenance"] ? <AssetMaintenanceUpdate key={data.history[0]?.id ?? id} requestKey={randomUUID()} requestId={id} status={request.status ?? "Open"} canManage={permissions["assets.manage"]}/> : null}</section>
    <section className="sb-work-surface p-4"><h2 className="text-sm font-semibold">Update history · {data.total}</h2>{!data.total ? <p className="mt-3 text-sm text-muted-foreground">No updates yet. Add the first update after reviewing the issue.</p> : null}<ol className="divide-y">{data.history.map(update => <li className="min-w-0 py-3" key={update.id}>
      <p className="break-words text-xs text-muted-foreground">{formatDateOnly(String(update.source_data["Update Date"] ?? update.created_at).replace(" ", "T"), "Date not recorded")} · {update.author_name}</p>
      <p className="mt-1 break-words text-sm font-medium">{String(update.source_data["Update Type"] ?? "Maintenance update")}</p>
      {update.source_data.Comment ? <p className="mt-2 whitespace-pre-wrap break-words text-sm">{String(update.source_data.Comment)}</p> : null}
      {update.source_data["Status Before"] !== update.source_data["Status After"] ? <p className="mt-1 break-words text-xs text-muted-foreground">{String(update.source_data["Status Before"] ?? "Unknown status")} → {String(update.source_data["Status After"] ?? "Unknown status")}</p> : null}
      <details><summary className="min-h-11 cursor-pointer py-3 text-xs">Original update details</summary><dl className="grid gap-2 text-xs sm:grid-cols-2">{Object.entries(update.source_data).filter(([key,value]) => !key.startsWith("_") && value !== null && value !== "").map(([key,value]) => <div className="min-w-0" key={key}><dt className="text-muted-foreground">{key}</dt><dd className="whitespace-pre-wrap break-words">{String(value)}</dd></div>)}</dl><p className="mt-2 break-words text-xs text-muted-foreground">{update.source_id}</p></details>
    </li>)}</ol></section>
    <section className="sb-work-surface p-4"><h2 className="text-sm font-semibold">Attachments · {data.attachmentTotal}</h2><AssetAttachmentList attachments={data.attachments} showMaintenanceLink={false}/>{data.attachmentTotal > 5 ? <Link className="block min-h-11 py-3 text-xs underline" href={`/asset-management/maintenance/${id}/attachments`}>All attachment records · {data.attachmentTotal}</Link> : null}{permissions["assets.maintenance"] || permissions["assets.manage"] ? <AssetAttachmentForm key={data.attachments[0]?.id ?? "empty"} assetId={request.asset_id} maintenanceId={id} canManage={permissions["assets.manage"]} requestKey={randomUUID()}/> : null}</section>
    {data.total > 50 ? <nav className="flex justify-between text-sm" aria-label="Maintenance history pages">{page > 1 ? <Link className="min-h-11 py-3 underline" href={`?page=${page - 1}`}>Previous</Link> : <span/>}{page * 50 < data.total ? <Link className="min-h-11 py-3 underline" href={`?page=${page + 1}`}>Next</Link> : null}</nav> : null}
  </WorkspaceGrid></>;
}
