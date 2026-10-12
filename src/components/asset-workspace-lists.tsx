import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ChevronRight, MapPin, Pencil } from "lucide-react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatNumber, formatDateOnly } from "@/lib/utils";
import type { AssetSummary, AssetHolding, AssetRecord, AssetOverview } from "@/server/queries/assets";

export function AssetRegisterRows({ assets, holdings, locations }: { assets: AssetSummary[]; holdings: AssetHolding[]; locations: Map<string, string> }) {
  const rows = assets.flatMap(asset => {
    const visible = holdings.filter(holding => holding.asset_id === asset.id);
    return (visible.length ? visible : [{ asset_id: asset.id, location_id: "", quantity: null, condition:null, status:null, latest_check_result:null }]).map(holding => ({ asset, holding }));
  });
  const quantity = (value: number | null) => value === null ? "Unknown" : formatNumber(value);
  return <>
    <Table mobileHidden compactUntil="md" aria-label="Asset register">
      <TableHeader><TableRow>{["Asset","Location","Classification","Qty","State / latest check"].map(label=><TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.map(({ asset, holding }) => { const details=asset.current_details ?? {}; const text=(key:string)=>details[key] == null || details[key] === "" ? "Unknown" : String(details[key]); return <TableRow key={`${asset.id}:${holding.location_id}`}>
        <TableCell className="min-w-48 whitespace-normal"><Link href={`/asset-management/assets/${asset.id}`} className="block py-1"><strong className="block font-semibold text-primary">{asset.asset_code}</strong><span className="block max-w-64">{asset.item_name}</span></Link></TableCell><TableCell className="whitespace-normal min-w-32">{holding.location_id ? locations.get(holding.location_id) ?? "Unavailable location" : "No accessible holding"}</TableCell>
        <TableCell className="min-w-40 whitespace-normal"><span className="block">{text("Category")}</span><span className="block text-muted-foreground">{text("Subcategory")}</span>{text("Department / Area") !== "Unknown" ? <span className="block text-muted-foreground">{text("Department / Area")}</span> : null}</TableCell><TableCell className={`tabular-nums ${holding.quantity === null ? "text-warning" : ""}`}>{holding.location_id ? quantity(holding.quantity) : "—"}</TableCell><TableCell className="min-w-36 whitespace-normal"><span className="block">{holding.status || "Unknown"}</span><span className="block text-muted-foreground">Condition: {holding.condition || "Unknown"}</span><span className="block text-muted-foreground">Check: {holding.latest_check_result || "Not recorded"}</span></TableCell>
      </TableRow>; })}</TableBody>
    </Table>
    <div className="divide-y md:hidden">{rows.map(({ asset, holding }) => <Link key={`${asset.id}:${holding.location_id}`} href={`/asset-management/assets/${asset.id}`} className="flex min-h-16 items-center justify-between gap-3 px-3 py-2"><span className="min-w-0"><small className="block text-xs text-muted-foreground">{asset.asset_code}</small><strong className="block break-words text-sm font-medium">{asset.item_name}</strong><small className="block text-xs text-muted-foreground">{holding.location_id ? locations.get(holding.location_id) ?? "Unavailable location" : "No accessible holding"}</small></span><span className={`shrink-0 text-sm tabular-nums ${holding.quantity === null ? "text-warning" : ""}`}>{holding.location_id ? quantity(holding.quantity) : "—"}</span></Link>)}</div>
  </>;
}

export function AssetPriorityBadge({ priority }: { priority?: string | null }) {
  const value = (priority ?? "").toLowerCase();
  return <Badge variant={["high", "critical"].includes(value) ? "danger" : ["medium", "urgent"].includes(value) ? "warning" : value === "low" ? "success" : "secondary"}>{priority ?? "Not recorded"}</Badge>;
}

export function AssetMaintenanceQueue({ records, assets, locations, selection }: { records: AssetRecord[]; assets: Map<string, AssetSummary>; locations: Map<string, string>; selection?: Record<string,string> }) {
  const href=(id:string)=>selection ? `/asset-management?${new URLSearchParams({...selection,view:"maintenance",ticket:id})}` : `/asset-management/maintenance/${id}`;
  const date = (record: AssetRecord) => formatDateOnly(String(record.source_data["Created Date"] ?? record.created_at ?? "").replace(" ", "T"), "Not recorded");
  if(selection) return <div className="max-h-[28rem] divide-y overflow-y-auto" aria-label="Maintenance queue">{records.map(record=><Link key={record.id} href={href(record.id)} aria-current={selection.ticket===record.id?"true":undefined} className="flex gap-3 p-3 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary aria-[current=true]:bg-[var(--sb-green-100)]"><Pencil className="mt-1 size-4 shrink-0" aria-hidden="true"/><span className="min-w-0 flex-1"><span className="flex flex-wrap items-start justify-between gap-2"><strong className="text-sm font-semibold">{assets.get(record.asset_id)?.item_name??"Unavailable asset"}</strong><AssetPriorityBadge priority={record.priority}/></span><span className="mt-1 block break-words text-xs">{record.description??"No description"}</span><span className="mt-1 block text-xs text-muted-foreground">{locations.get(record.location_id??"")??"Unavailable location"}</span><span className="mt-2 flex items-center justify-between gap-2"><StatusBadge status={(record.status??"unknown").toLowerCase()}/><span className="text-xs text-muted-foreground">{date(record)}</span></span></span></Link>)}</div>;
  return <>
    <Table mobileHidden compactUntil="md" aria-label="Maintenance queue"><TableHeader><TableRow><TableHead><span className="sr-only">Open request</span></TableHead><TableHead>Asset / issue</TableHead><TableHead>Location</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Reported</TableHead></TableRow></TableHeader><TableBody>{records.map(record => <TableRow key={record.id}><TableCell className="w-10"><Link href={href(record.id)} aria-label={`Open ${assets.get(record.asset_id)?.item_name ?? "maintenance request"}`} className="flex min-h-9 items-center justify-center"><Pencil className="size-4" aria-hidden="true"/></Link></TableCell><TableCell><Link href={href(record.id)} className="block min-h-9 py-1"><strong className="block whitespace-normal font-medium">{assets.get(record.asset_id)?.item_name ?? "Unavailable asset"}</strong><span className="block max-w-72 truncate text-muted-foreground">{record.description ?? "No description"}</span></Link></TableCell><TableCell className="whitespace-normal">{locations.get(record.location_id ?? "") ?? "Unavailable location"}</TableCell><TableCell><AssetPriorityBadge priority={record.priority}/></TableCell><TableCell><StatusBadge status={(record.status ?? "unknown").toLowerCase()}/></TableCell><TableCell>{date(record)}</TableCell></TableRow>)}</TableBody></Table>
    <div className="grid gap-2 p-3 md:hidden">{records.map(record => <Link href={href(record.id)} key={record.id} className="block rounded-[var(--sb-panel-radius)] border border-[var(--sb-border)] bg-white p-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block break-words text-sm font-semibold">{assets.get(record.asset_id)?.item_name ?? "Unavailable asset"}</strong><span className="text-xs text-muted-foreground">{assets.get(record.asset_id)?.asset_code ?? "Unknown asset ID"}</span></div><AssetPriorityBadge priority={record.priority}/></div>
      <p className="mt-2 break-words text-sm">{record.description ?? "No description"}</p>
      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true"/>{locations.get(record.location_id ?? "") ?? "Unavailable location"}</p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2"><StatusBadge status={record.status ?? "unknown"}/><span className="text-xs text-muted-foreground">{date(record)}</span><ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/></div>
    </Link>)}</div>
  </>;
}

export function AssetDailyCheckLocations({ locations, date }: { locations: AssetOverview["checklist"]; date: string }) {
  const status = (location: AssetOverview["checklist"][number]) => !location.open ? location.kind === "event" ? "No activity" : "Closed" : !location.expected ? "No assets due" : location.checked >= location.expected ? "Complete" : location.checked ? "In progress" : "Not started";
  const href = (location: AssetOverview["checklist"][number]) => `/asset-management/locations/${location.id}${location.open && location.expected ? `?check=1&date=${date}` : ""}`;
  return <>
    <div className="grid grid-cols-1 md:grid-cols-2">{locations.map(location => <Link className="block border-b p-3 transition-colors md:odd:border-r hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary" href={href(location)} key={location.id}>
      <div className="flex items-start justify-between gap-3"><strong className="min-w-0 break-words text-sm font-semibold">{location.name}</strong><ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/></div>
      <div className="mt-2 flex items-center justify-between gap-3"><Badge variant={location.open && location.checked >= location.expected && location.expected > 0 ? "success" : location.open && location.expected > 0 ? "warning" : "secondary"}>{status(location)}</Badge><span className="text-xs tabular-nums">{location.open && location.expected ? `${location.checked} / ${location.expected} checked` : "—"}</span></div>
      {location.open && location.expected > 0 ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-primary" style={{width:`${Math.min(100,location.checked/location.expected*100)}%`}}/></div> : null}
      {location.reason ? <p className="mt-1 text-xs text-muted-foreground">{location.reason}</p> : null}
    </Link>)}</div>
  </>;
}
