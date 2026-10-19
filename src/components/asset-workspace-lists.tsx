import { formatRegisteredAssetQuantity } from "@/lib/asset-quantity-display";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ChevronRight, MapPin, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDateOnly } from "@/lib/utils";
import type { AssetSummary, AssetHolding, AssetRecord, AssetOverview } from "@/server/queries/assets";

export function AssetRegisterRows({ assets, holdings, locations }: { assets: AssetSummary[]; holdings: AssetHolding[]; locations: Map<string, string> }) {
  const rows = assets.flatMap(asset => {
    const visible = holdings.filter(holding => holding.asset_id === asset.id);
    return (visible.length ? visible : [{ asset_id: asset.id, location_id: "", quantity: null, condition:null, status:null, latest_check_result:null }]).map(holding => ({ asset, holding }));
  });
  return <>
    <Table mobileHidden compactUntil="md" aria-label="Asset register">
      <TableHeader><TableRow>{["Asset","Location","Classification","Registered qty","State / latest check"].map(label=><TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.map(({ asset, holding }) => { const details=asset.current_details ?? {}; const text=(key:string)=>details[key] == null || details[key] === "" ? "Unknown" : String(details[key]); return <TableRow key={`${asset.id}:${holding.location_id}`}>
        <TableCell className="min-w-48 whitespace-normal"><Link href={`/asset-management/assets/${asset.id}`} className="block py-1"><strong className="block font-semibold text-primary">{asset.asset_code}</strong><span className="block max-w-64">{asset.item_name}</span></Link></TableCell><TableCell className="whitespace-normal min-w-32">{holding.location_id ? locations.get(holding.location_id) ?? "Unavailable location" : "No accessible holding"}</TableCell>
        <TableCell className="min-w-40 whitespace-normal"><span className="block">{text("Category")}</span><span className="block text-muted-foreground">{text("Subcategory")}</span>{text("Department / Area") !== "Unknown" ? <span className="block text-muted-foreground">{text("Department / Area")}</span> : null}</TableCell><TableCell className={`tabular-nums ${holding.quantity === null ? "text-warning" : ""}`}>{holding.location_id ? formatRegisteredAssetQuantity(holding.quantity) : "—"}</TableCell><TableCell className="min-w-36 whitespace-normal"><span className="block">{holding.status || "Unknown"}</span><span className="block text-muted-foreground">Condition: {holding.condition || "Unknown"}</span><span className="block text-muted-foreground">Check: {holding.latest_check_result || "Not recorded"}</span></TableCell>
      </TableRow>; })}</TableBody>
    </Table>
    <div className="divide-y md:hidden">{rows.map(({ asset, holding }) => <Link key={`${asset.id}:${holding.location_id}`} href={`/asset-management/assets/${asset.id}`} className="flex min-h-16 items-center justify-between gap-3 px-3 py-2"><span className="min-w-0"><small className="block text-xs text-muted-foreground">{asset.asset_code}</small><strong className="block break-words text-sm font-medium">{asset.item_name}</strong><small className="block text-xs text-muted-foreground">{holding.location_id ? locations.get(holding.location_id) ?? "Unavailable location" : "No accessible holding"}</small></span><span className={`shrink-0 text-sm tabular-nums ${holding.quantity === null ? "text-warning" : ""}`}><small className="block text-xs text-muted-foreground">Registered qty</small>{holding.location_id ? formatRegisteredAssetQuantity(holding.quantity) : "—"}</span></Link>)}</div>
  </>;
}

export function AssetPriorityBadge({ priority }: { priority?: string | null }) {
  const value = (priority ?? "").toLowerCase();
  return <Badge variant={["high", "critical"].includes(value) ? "danger" : ["medium", "urgent"].includes(value) ? "warning" : value === "low" ? "success" : "secondary"}>{priority ?? "Not recorded"}</Badge>;
}

export function AssetMaintenanceQueue({ records, assets, locations, selection }: { records: AssetRecord[]; assets: Map<string, AssetSummary>; locations: Map<string, string>; selection?: Record<string,string> }) {
  const href=(id:string)=>selection ? `/asset-management?${new URLSearchParams({...selection,view:"maintenance",ticket:id})}` : `/asset-management/maintenance/${id}`;
  const date = (record: AssetRecord) => formatDateOnly(String(record.source_data["Created Date"] ?? record.created_at ?? "").replace(" ", "T"), "Not recorded");
  return <div className="sb-maintenance-queue divide-y" aria-label="Maintenance queue">{records.map(record=><Link key={record.id} href={href(record.id)} aria-current={selection?.ticket===record.id?"true":undefined} title={record.description??undefined} className="block px-3 py-2.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary aria-[current=true]:bg-[var(--sb-green-100)]"><span className="flex min-w-0 items-center gap-2"><strong className="min-w-0 flex-1 truncate text-sm font-semibold">{assets.get(record.asset_id??"")?.item_name??"Site problem"}</strong><StatusBadge status={(record.status??"unknown").toLowerCase()}/><AssetPriorityBadge priority={record.priority}/></span><span className="mt-1 flex min-w-0 items-center gap-3 text-xs text-muted-foreground"><span className="inline-flex min-w-0 flex-1 items-center gap-1"><MapPin className="size-3 shrink-0" aria-hidden="true"/><span className="truncate">{locations.get(record.location_id??"")??"Unavailable location"}</span></span><span className="inline-flex shrink-0 items-center gap-1"><CalendarDays className="size-3" aria-hidden="true"/>{date(record)}</span><ChevronRight className="size-3.5 shrink-0" aria-hidden="true"/></span></Link>)}</div>;
}

export function AssetDailyCheckLocations({ locations, date }: { locations: AssetOverview["checklist"]; date: string }) {
  const status = (location: AssetOverview["checklist"][number]) => location.submitted ? "Submitted" : !location.open ? location.kind === "event" ? "No activity" : location.kind === "other" ? "Not scheduled" : "Closed" : !location.expected ? "No assets due" : location.checked >= location.expected ? "Complete" : location.checked ? "In progress" : "Not started";
  const href = (location: AssetOverview["checklist"][number]) => `/asset-management/locations/${location.id}${location.open && location.expected ? `?check=1&date=${date}` : ""}`;
  return <div className="divide-y">{locations.map(location=><Link key={location.id} href={href(location)} className="flex min-h-11 items-center gap-2 px-3 py-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary" title={location.reason??undefined}><strong className="min-w-0 flex-1 truncate text-sm font-medium">{location.name}</strong><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{location.open&&location.expected?`${location.checked}/${location.expected}`:"—"}</span><Badge variant={(location.submitted || location.open&&location.checked>=location.expected&&location.expected>0)?"success":location.open&&location.expected>0?"warning":"secondary"}>{status(location)}</Badge><ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true"/></Link>)}</div>;
}
