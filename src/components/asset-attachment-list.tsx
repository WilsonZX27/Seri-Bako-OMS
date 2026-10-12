import Link from "next/link";
import type { AssetAttachment } from "@/server/queries/assets";
import { formatDateOnly, formatDateTime } from "@/lib/utils";

export function AssetAttachmentList({ attachments, showMaintenanceLink = true }: { attachments: AssetAttachment[]; showMaintenanceLink?: boolean }) {
  if (!attachments.length) return <p className="py-3 text-sm text-muted-foreground">No attachment records.</p>;
  return <ul className="divide-y">{attachments.map(attachment => {
    const native = attachment.source_data.Origin === "OMS upload";
    const name = String(attachment.source_data["File Name"] || "Attachment");
    const date = native ? formatDateTime(attachment.created_at, "Date not recorded") : formatDateOnly(String(attachment.source_data["Uploaded Date"] || ""), "Date not recorded");
    return <li className="min-w-0 py-3 text-xs" key={attachment.id}>
      {attachment.verified_at && attachment.storage_path ? <Link className="block min-h-11 break-words py-3 font-medium underline" href={`/asset-management/attachments/${attachment.id}`} target="_blank" rel="noopener noreferrer">{name}</Link> : <p className="break-words font-medium">{name}</p>}
      <p className="mt-1 break-words text-muted-foreground">{String(attachment.source_data["File Category"] || attachment.source_data.Kind || "Attachment")} · {String(attachment.source_data["Uploaded By"] || "Uploader not recorded")} · {date}</p>
      <p className={`mt-1 ${attachment.verified_at ? "text-muted-foreground" : "text-warning"}`}>{attachment.verified_at ? native ? "Verified upload" : "Verified source attachment" : native ? "Upload not finished" : "Awaiting attachment verification"}</p>
      {showMaintenanceLink && attachment.maintenance_id ? <Link className="block min-h-11 py-3 underline" href={`/asset-management/maintenance/${attachment.maintenance_id}`}>Maintenance record</Link> : null}
      {!native ? <details><summary className="min-h-11 cursor-pointer py-3">Original attachment details</summary><dl className="grid gap-2 sm:grid-cols-2">{Object.entries(attachment.source_data).filter(([key,value])=>!key.startsWith("_") && value!==null && value!=="").map(([key,value])=><div className="min-w-0" key={key}><dt className="text-muted-foreground">{key}</dt><dd className="break-words">{String(value)}</dd></div>)}</dl></details> : null}
    </li>;
  })}</ul>;
}
