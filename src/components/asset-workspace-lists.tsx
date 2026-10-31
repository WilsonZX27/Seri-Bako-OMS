import { groupMaintenanceRequests } from "@/lib/asset-maintenance-groups";
import { AssetAuditDetails } from "@/components/asset-audit-details";
import type { ReactNode } from "react";
import { formatRegisteredAssetQuantity } from "@/lib/asset-quantity-display";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ChevronRight, MapPin, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import type { AssetSummary, AssetHolding, AssetRecord, AssetOverview } from "@/server/queries/assets";

export function AssetRegisterRows({ assets, holdings, locations }: { assets: AssetSummary[]; holdings: AssetHolding[]; locations: Map<string, string> }) {
  const rows = assets.flatMap(asset => {
    const visible = holdings.filter(holding => holding.asset_id === asset.id);
    return (visible.length ? visible : [{ asset_id: asset.id, location_id: "", quantity: null, condition:null, status:null, latest_check_result:null }]).map(holding => ({ asset, holding }));
  });
  return <>
    <Table mobileHidden compactUntil="md" style={{tableLayout:"fixed",minWidth:"48rem"}} aria-label="Asset register">
      <colgroup>{[23,17,15,12,11,12,10].map((width,index)=><col key={index} style={{width:`${width}%`}}/>)}</colgroup>
      <TableHeader><TableRow>{["Asset","Location","Classification","Registered qty","Status","Condition","Check"].map(label=><TableHead key={label} className="whitespace-normal break-words">{label}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.map(({ asset, holding }) => { const details=asset.current_details ?? {}; const text=(key:string)=>details[key] == null || details[key] === "" ? "Unknown" : String(details[key]); return <TableRow key={`${asset.id}:${holding.location_id}`}>
        <TableCell className="min-w-48 whitespace-normal lg:min-w-0"><Link href={`/asset-management/assets/${asset.id}`} className="block py-1"><strong className="block font-semibold text-primary">{asset.asset_code}</strong><span className="block max-w-64">{asset.item_name}</span></Link></TableCell><TableCell className="whitespace-normal min-w-32 lg:min-w-0">{holding.location_id ? locations.get(holding.location_id) ?? "Unavailable location" : "No accessible holding"}</TableCell>
        <TableCell className="min-w-40 whitespace-normal lg:min-w-0"><span className="block">{text("Category")}</span><span className="block text-muted-foreground">{text("Subcategory")}</span>{text("Department / Area") !== "Unknown" ? <span className="block text-muted-foreground">{text("Department / Area")}</span> : null}</TableCell><TableCell className={`tabular-nums ${holding.quantity === null ? "text-warning" : ""}`}>{holding.location_id ? formatRegisteredAssetQuantity(holding.quantity) : "—"}</TableCell><TableCell><StatusBadge status={(holding.status || "unknown").toLowerCase()}/></TableCell><TableCell className="whitespace-normal break-words">{holding.condition || "Unknown"}</TableCell><TableCell className="whitespace-normal break-words">{holding.latest_check_result || "Not recorded"}</TableCell>
      </TableRow>; })}</TableBody>
    </Table>
    <div className="divide-y md:hidden"><div className="flex justify-between px-3 py-2 text-xs font-medium text-muted-foreground"><span>Asset</span><span>Location / Registered qty</span></div>{rows.map(({ asset, holding }) => { const location = holding.location_id ? locations.get(holding.location_id) ?? "Unavailable location" : "No accessible holding"; return <Link key={`${asset.id}:${holding.location_id}`} href={`/asset-management/assets/${asset.id}`} className="grid min-h-16 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 px-3 py-2"><span className="min-w-0"><small className="block truncate text-xs text-muted-foreground" title={asset.asset_code}>{asset.asset_code}</small><strong className="block truncate text-sm font-medium" title={asset.item_name}>{asset.item_name}</strong></span><span className="min-w-0 text-right"><small className="block truncate text-xs text-muted-foreground" title={location}>{location}</small><span aria-label={`Registered quantity: ${holding.location_id ? formatRegisteredAssetQuantity(holding.quantity) : "No accessible holding"}`} className={`block text-sm tabular-nums ${holding.quantity === null ? "text-warning" : ""}`}>{holding.location_id ? formatRegisteredAssetQuantity(holding.quantity) : "—"}</span></span></Link>; })}</div>
  </>;
}

export function AssetPriorityBadge({ priority }: { priority?: string | null }) {
  const value = (priority ?? "").toLowerCase();
  return <Badge variant={["high", "critical"].includes(value) ? "danger" : ["medium", "urgent"].includes(value) ? "warning" : value === "low" ? "success" : "secondary"}>{priority ?? "Not recorded"}</Badge>;
}

export function AssetMaintenanceQueue({ records, assets, locations, selection, plain = false }: { records: AssetRecord[]; assets: Map<string, AssetSummary>; locations: Map<string, string>; selection?: Record<string,string>; plain?: boolean }) {
  const href=(id:string)=>selection ? `/asset-management?${new URLSearchParams({...selection,view:"maintenance",ticket:id})}` : `/asset-management/maintenance/${id}`;
  const date = (record: AssetRecord) => formatDateOnly(String(record.source_data["Created Date"] ?? record.created_at ?? "").replace(" ", "T"), "Not recorded");
  const requestLink = (record: AssetRecord) => <Link key={record.id} href={href(record.id)} aria-current={selection?.ticket === record.id ? "true" : undefined} title={record.description ?? undefined} className="block px-3 py-3 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary aria-[current=true]:bg-[var(--sb-green-100)]">
    <span className="flex min-w-0 items-start justify-between gap-2"><strong className="line-clamp-2 min-w-0 break-words text-sm font-semibold" title={assets.get(record.asset_id ?? "")?.item_name ?? "Site problem"}>{assets.get(record.asset_id ?? "")?.item_name ?? "Site problem"}</strong><span className="flex shrink-0 flex-wrap justify-end gap-1"><StatusBadge status={(record.status ?? "unknown").toLowerCase()}/><AssetPriorityBadge priority={record.priority}/></span></span>
    <span className="mt-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 text-[11px] text-muted-foreground"><span className="whitespace-nowrap">{assets.get(record.asset_id ?? "")?.asset_code ?? "—"}</span><span className="inline-flex min-w-0 items-center gap-1" title={locations.get(record.location_id ?? "") ?? "Unavailable location"}><MapPin className="size-3 shrink-0" aria-hidden="true"/><span className="truncate">{locations.get(record.location_id ?? "") ?? "Unavailable location"}</span></span><span className="inline-flex shrink-0 items-center gap-1"><CalendarDays className="size-3" aria-hidden="true"/>{date(record)}</span><ChevronRight className="size-3.5 shrink-0" aria-hidden="true"/></span>
  </Link>;
  return <div className={`sb-maintenance-queue ${plain ? "divide-y" : "space-y-3"}`} aria-label="Maintenance queue">{groupMaintenanceRequests(records).map(rows=><section key={rows[0].id} className={plain ? "overflow-hidden" : "overflow-hidden rounded-[var(--sb-control-radius)] border border-[var(--sb-border-soft)]"}>{requestLink(rows[0])}{rows.length>1?<details open={rows.slice(1).some(row=>row.id===selection?.ticket)} className="border-t px-3"><summary className="min-h-11 cursor-pointer py-3 text-xs text-muted-foreground">{rows.length-1} other matching reports</summary><div className="divide-y">{rows.slice(1).map(requestLink)}</div></details>:null}</section>)}</div>;
}

export function AssetDailyCheckLocations({ locations, date }: { locations: AssetOverview["checklist"]; date: string }) {
  const status = (location: AssetOverview["checklist"][number]) => location.submitted ? "Submitted" : !location.open ? location.kind === "event" ? "No activity" : location.kind === "other" ? "Not scheduled" : "Closed" : !location.expected ? "No assets due" : location.checked >= location.expected ? "Complete" : location.checked ? "In progress" : "Not started";
  const href = (location: AssetOverview["checklist"][number]) => `/asset-management/locations/${location.id}${location.open && location.expected ? `?check=1&date=${date}` : ""}`;
  return <div className="divide-y">{locations.map(location=><Link key={location.id} href={href(location)} className="flex min-h-11 items-center gap-2 px-3 py-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary" title={location.reason??undefined}><strong className="min-w-0 flex-1 truncate text-sm font-medium">{location.name}</strong><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{location.open&&location.expected?`${location.checked}/${location.expected}`:"—"}</span><Badge variant={(location.submitted || location.open&&location.checked>=location.expected&&location.expected>0)?"success":location.open&&location.expected>0?"warning":"secondary"}>{status(location)}</Badge><ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true"/></Link>)}</div>;
}

export function AssetInspectionRows({ records, assets, locations }: { records: AssetRecord[]; assets: Map<string, AssetSummary>; locations: Map<string, string> }) {
  return <div className="divide-y">{records.map(record => <details key={record.id} className="group min-w-0">
    <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0"><span className="block break-words text-sm font-medium">{assets.get(record.asset_id ?? "")?.item_name ?? "Unavailable asset"}</span><span className="block break-words text-xs text-muted-foreground">{assets.get(record.asset_id ?? "")?.asset_code ?? "—"} · {locations.get(record.location_id ?? "") ?? "Unavailable location"}</span></span>
      <StatusBadge status={(record.result ?? record.status ?? "unknown").toLowerCase()}/><ChevronRight className="size-4 shrink-0 text-muted-foreground group-open:rotate-90" aria-hidden="true"/>
    </summary>
    <div className="space-y-3 border-t border-[var(--sb-border-soft)] px-3 py-3 text-xs"><span className="mt-1 block break-words text-xs text-muted-foreground">{formatDateOnly(record.check_date ?? record.created_at, "Date unavailable")}{record.author_name ? ` · ${record.author_name}` : ""}{record.quantity !== undefined ? ` · Qty ${record.quantity === null ? "Unknown" : formatNumber(record.quantity)}` : ""}</span>
      {record.asset_id ? <Link className="inline-flex min-h-[var(--sb-control-height)] items-center rounded-[var(--sb-control-radius)] border border-[var(--sb-border)] px-3 font-medium" href={`/asset-management/assets/${record.asset_id}`}>Open asset</Link> : null}
      {record.description ? <p className="break-words">{record.description}</p> : null}
      <AssetAuditDetails data={record.source_data}/>
    </div>
  </details>)}</div>;
}

export function AssetSectionHeading({title,value,inset=false}:{title:string;value:ReactNode;inset?:boolean}) {
  return <h2 className={`flex items-center justify-between gap-3 border-b text-sm font-semibold ${inset?"mb-3 pb-3":"p-3"}`}><span>{title}</span><span className="text-sm font-semibold tabular-nums">{value}</span></h2>;
}
