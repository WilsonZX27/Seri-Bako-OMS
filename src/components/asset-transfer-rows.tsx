import Link from "next/link";
import { ChevronRight, CalendarDays, UserRound } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import type { AssetRecord, AssetSummary } from "@/server/queries/assets";

export function AssetTransferRows({records,assets,locations}:{records:AssetRecord[];assets:Map<string,AssetSummary>;locations:Map<string,string>}) {
  return <ul className="divide-y divide-[var(--sb-border-soft)]" aria-label="Asset transfers">{records.map(record=>{
    const title=record.batch_id?`${record.line_count} asset${record.line_count===1?"":"s"}`:assets.get(record.asset_id??"")?.item_name??"Asset transfer";
    return <li key={record.id}><Link href={`/asset-management/transfers/${record.id}`} className="block px-4 py-3 hover:bg-muted focus-visible:outline-primary">
      <span className="flex items-center justify-between gap-3"><strong className="min-w-0 break-words text-sm font-semibold">{locations.get(record.from_location_id??"")??"Restricted location"} → {locations.get(record.to_location_id??"")??"Restricted location"}</strong><span className="flex shrink-0 items-center gap-2"><StatusBadge status={record.status??"unknown"}/><ChevronRight className="size-4" aria-hidden="true"/></span></span>
      <span className="mt-1 block truncate text-xs text-muted-foreground" title={[title,record.reason].filter(Boolean).join(" · ")}>{title}{record.reason ? ` · ${record.reason}` : ""}</span>
      <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><CalendarDays className="size-3" aria-hidden="true"/>{formatDateOnly(record.created_at)}</span><span className="inline-flex items-center gap-1"><UserRound className="size-3" aria-hidden="true"/>{record.author_name||"Unrecorded author"}</span>{record.quantity!==undefined?<span>Qty {record.quantity===null?"Unknown":formatNumber(record.quantity)}</span>:null}</span>
    </Link></li>;
  })}</ul>;
}
