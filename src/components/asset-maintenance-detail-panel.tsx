import { AssetPriorityBadge } from "@/components/asset-workspace-lists";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowUpRight, CalendarDays, UserRound, Pencil } from "lucide-react";
import { formatDateOnly } from "@/lib/utils";
import { randomUUID } from "node:crypto";
import { AssetAttachmentList } from "@/components/asset-attachment-list";
import { AssetAttachmentForm } from "@/components/asset-attachment-form";
import Link from "next/link";
import { AssetMaintenanceUpdate } from "@/components/asset-maintenance-form";
import { getAssetDetail, getAssetMaintenanceDetail } from "@/server/queries/assets";

export function AssetMaintenanceDetailPanel({data,asset,permissions,compact=false, hideUpdate=false}:{compact?:boolean;hideUpdate?:boolean;data:NonNullable<Awaited<ReturnType<typeof getAssetMaintenanceDetail>>>;asset:Awaited<ReturnType<typeof getAssetDetail>>;permissions:Record<string,boolean>}) {
 const request=data.request,id=request.id,location=data.location;
 return <div className="min-w-0 space-y-3">
  <section className="sb-work-surface p-3"><header className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-base font-semibold">{asset?.asset.item_name ?? "Maintenance request"}</h2><p className="mt-0.5 text-xs text-muted-foreground">{asset?.asset.asset_code} · {location?.source_name ?? "Location not recorded"}</p></div>{request.asset_id ? <Link href={`/asset-management/assets/${request.asset_id}`} aria-label="Open asset" title="Open asset" className="inline-flex size-9 shrink-0 items-center justify-center rounded hover:bg-muted"><ArrowUpRight className="size-4" aria-hidden="true"/></Link>:null}</header>
  {!compact ? <div className="mt-2 flex gap-2"><StatusBadge status={(request.status??"unknown").toLowerCase()}/><AssetPriorityBadge priority={request.priority}/></div>:null}
  <p className="mt-3 whitespace-pre-wrap break-words text-sm">{request.description ?? "No description recorded."}</p>
  <dl className="mt-3 grid gap-2 rounded-lg bg-[var(--sb-surface-muted)] p-3 text-sm xl:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Submitted by</dt><dd className="font-medium">{request.author_name ?? "Unknown author"}</dd></div><div><dt className="text-xs text-muted-foreground">Reference</dt><dd className="break-all text-xs">{request.source_id}</dd></div></dl>
  {!hideUpdate && permissions["assets.maintenance"] ? <AssetMaintenanceUpdate key={id} requestKey={randomUUID()} requestId={id} status={request.status ?? "Open"} canManage={permissions["assets.manage"]}/>:null}</section>
    <section className="sb-work-surface p-3"><h2 className="mb-3 text-sm font-semibold">Update history · {data.total}</h2>{!data.total ? <p className="mt-3 text-sm text-muted-foreground">No updates yet.</p> : null}<ol className="divide-y">{data.history.map(update => <li className="relative min-w-0 my-3 rounded-lg border bg-[var(--sb-surface-muted)] p-3" key={update.id}>
      <p className="break-words text-sm font-semibold">{String(update.source_data["Update Type"] ?? "Maintenance update")}</p>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div className="flex items-start gap-2"><CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/><div><dt className="text-muted-foreground">Date</dt><dd className="mt-1 font-medium">{formatDateOnly(String(update.source_data["Update Date"] ?? update.created_at).replace(" ", "T"), "Date not recorded")}</dd></div></div>
        <div className="flex items-start gap-2"><UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/><div><dt className="text-muted-foreground">Updated by</dt><dd className="mt-1 break-words font-medium">{update.author_name ?? "Unknown author"}</dd></div></div>
      </dl>
      {update.source_data.Comment ? <div className="mt-3 border-t pt-3"><h3 className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Pencil className="size-4" aria-hidden="true"/>Note</h3><p className="pl-6 whitespace-pre-wrap break-words text-xs">{String(update.source_data.Comment)}</p></div> : null}
      {update.source_data["Status Before"] !== update.source_data["Status After"] ? <p className="mt-1 break-words text-xs text-muted-foreground">{String(update.source_data["Status Before"] ?? "Unknown status")} → {String(update.source_data["Status After"] ?? "Unknown status")}</p> : null}
      <details><summary className="min-h-11 cursor-pointer py-3 text-xs">View audit details</summary><dl className="grid gap-2 text-xs sm:grid-cols-2">{Object.entries(update.source_data).filter(([key,value]) => !key.startsWith("_") && value !== null && value !== "").map(([key,value]) => <div className="min-w-0" key={key}><dt className="text-muted-foreground">{key}</dt><dd className="whitespace-pre-wrap break-words">{String(value)}</dd></div>)}</dl><p className="mt-2 break-words text-xs text-muted-foreground">{update.source_id}</p></details>
    </li>)}</ol></section>
    <section className="sb-work-surface p-3"><h2 className="mb-3 text-sm font-semibold">Attachments · {data.attachmentTotal}</h2><AssetAttachmentList attachments={data.attachments} showMaintenanceLink={false}/>{data.attachmentTotal > 5 ? <Link className="block min-h-11 py-3 text-xs underline" href={`/asset-management/maintenance/${id}/attachments`}>All attachment records · {data.attachmentTotal}</Link> : null}{permissions["assets.maintenance"] || permissions["assets.manage"] || permissions["assets.report"] ? <details open className="mt-3 border-t pt-2"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Add attachment</summary><AssetAttachmentForm key={data.attachments[0]?.id ?? "empty"} assetId={request.asset_id} maintenanceId={id} canManage={permissions["assets.manage"]} requestKey={randomUUID()}/></details> : null}</section></div>;
}
