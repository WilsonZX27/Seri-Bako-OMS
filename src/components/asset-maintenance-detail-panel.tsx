import { AssetPriorityBadge } from "@/components/asset-workspace-lists";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowUpRight } from "lucide-react";
import { formatDateOnly } from "@/lib/utils";
import { randomUUID } from "node:crypto";
import { AssetAttachmentList } from "@/components/asset-attachment-list";
import { AssetAttachmentForm } from "@/components/asset-attachment-form";
import Link from "next/link";
import { AssetMaintenanceUpdate } from "@/components/asset-maintenance-form";
import { getAssetDetail, getAssetMaintenanceDetail } from "@/server/queries/assets";

export function AssetMaintenanceDetailPanel({data,asset,permissions,compact=false}:{compact?:boolean;data:NonNullable<Awaited<ReturnType<typeof getAssetMaintenanceDetail>>>;asset:Awaited<ReturnType<typeof getAssetDetail>>;permissions:Record<string,boolean>}) {
 const request=data.request,id=request.id,location=data.location;
 return <div className="min-w-0 space-y-3">
  <section className="sb-work-surface p-3"><header className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-base font-semibold">{asset?.asset.item_name ?? "Maintenance request"}</h2><p className="mt-0.5 text-xs text-muted-foreground">{asset?.asset.asset_code} · {location?.source_name ?? "Location not recorded"}</p></div>{request.asset_id ? <Link href={`/asset-management/assets/${request.asset_id}`} aria-label="Open asset" title="Open asset" className="inline-flex size-9 shrink-0 items-center justify-center rounded hover:bg-muted"><ArrowUpRight className="size-4" aria-hidden="true"/></Link>:null}</header>
  {!compact ? <div className="mt-2 flex gap-2"><StatusBadge status={(request.status??"unknown").toLowerCase()}/><AssetPriorityBadge priority={request.priority}/></div>:null}
  <p className="mt-3 whitespace-pre-wrap break-words text-sm">{request.description ?? "No description recorded."}</p>
  <dl className="mt-3 grid gap-2 rounded-lg bg-[var(--sb-surface-muted)] p-3 text-sm"><div><dt className="text-xs text-muted-foreground">Submitted by</dt><dd className="font-medium">{request.author_name ?? "Unknown author"}</dd></div><div><dt className="text-xs text-muted-foreground">Reference</dt><dd className="break-all text-xs">{request.source_id}</dd></div></dl>
  {permissions["assets.maintenance"] ? <AssetMaintenanceUpdate key={id} requestKey={randomUUID()} requestId={id} status={request.status ?? "Open"} canManage={permissions["assets.manage"]}/>:null}</section>
    <section className="sb-work-surface p-3"><h2 className="mb-3 text-sm font-semibold">Update history · {data.total}</h2>{!data.total ? <p className="mt-3 text-sm text-muted-foreground">No updates yet.</p> : null}<ol className="divide-y">{data.history.map(update => <li className="min-w-0 py-3" key={update.id}>
      <p className="break-words text-xs text-muted-foreground">{formatDateOnly(String(update.source_data["Update Date"] ?? update.created_at).replace(" ", "T"), "Date not recorded")} · {update.author_name}</p>
      <p className="mt-1 break-words text-sm font-medium">{String(update.source_data["Update Type"] ?? "Maintenance update")}</p>
      {update.source_data.Comment ? <p className="mt-2 whitespace-pre-wrap break-words text-sm">{String(update.source_data.Comment)}</p> : null}
      {update.source_data["Status Before"] !== update.source_data["Status After"] ? <p className="mt-1 break-words text-xs text-muted-foreground">{String(update.source_data["Status Before"] ?? "Unknown status")} → {String(update.source_data["Status After"] ?? "Unknown status")}</p> : null}
      <details><summary className="min-h-11 cursor-pointer py-3 text-xs">Original update details</summary><dl className="grid gap-2 text-xs sm:grid-cols-2">{Object.entries(update.source_data).filter(([key,value]) => !key.startsWith("_") && value !== null && value !== "").map(([key,value]) => <div className="min-w-0" key={key}><dt className="text-muted-foreground">{key}</dt><dd className="whitespace-pre-wrap break-words">{String(value)}</dd></div>)}</dl><p className="mt-2 break-words text-xs text-muted-foreground">{update.source_id}</p></details>
    </li>)}</ol></section>
    <section className="sb-work-surface p-3"><h2 className="mb-3 text-sm font-semibold">Attachments · {data.attachmentTotal}</h2><AssetAttachmentList attachments={data.attachments} showMaintenanceLink={false}/>{data.attachmentTotal > 5 ? <Link className="block min-h-11 py-3 text-xs underline" href={`/asset-management/maintenance/${id}/attachments`}>All attachment records · {data.attachmentTotal}</Link> : null}{permissions["assets.maintenance"] || permissions["assets.manage"] || permissions["assets.report"] ? <AssetAttachmentForm key={data.attachments[0]?.id ?? "empty"} assetId={request.asset_id} maintenanceId={id} canManage={permissions["assets.manage"]} requestKey={randomUUID()}/> : null}</section></div>;
}
