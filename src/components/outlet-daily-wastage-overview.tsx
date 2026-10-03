import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, OperationalList, OperationalListRow } from "@/components/ui/table";
import { Notice } from "@/components/ui/system-states";
import type { getOutletDailyDemandTrend } from "@/server/queries/outlet-daily-records";
type Trend = Awaited<ReturnType<typeof getOutletDailyDemandTrend>>;
const rate = (received: number, wastage: number) => received > 0 ? `${new Intl.NumberFormat("en-MY", { maximumFractionDigits: 1 }).format(wastage / received * 100)}%` : "—";
export function OutletDailyWastageOverview({ trend, view = "outlets" }: { trend: Trend | null; view?: "outlets" | "products" }) {
 if (!trend) return <Notice tone="warning" title="Wastage insight unavailable">Reload this view to retry. Daily Records remain available in the first tab.</Notice>;
 const rows = view === "outlets" ? [...trend.outlets].sort((a,b)=>b.wastage-a.wastage).map(o=>({id:o.id,name:o.name,received:o.received,wastage:o.wastage,href:`/outlet-daily-records?branch=${o.id}`,available:!o.no_completed_records})) : trend.top_wastage_products.map(p=>({id:p.id,name:p.name,received:p.received,wastage:p.wastage,href:null,available:true}));
 return <section className="sb-list-content-card overflow-hidden" aria-label={view === "outlets" ? "Wastage by outlet" : "Wastage by product"}>
  <Table mobileHidden><TableHeader><TableRow><TableHead>{view === "outlets" ? "Outlet" : "Product"}</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Wastage</TableHead><TableHead className="text-right">Rate</TableHead></TableRow></TableHeader><TableBody>{rows.map(r=><TableRow key={r.id}><TableCell>{r.href?<Link className="font-medium text-primary hover:underline" href={r.href}>{r.name}</Link>:r.name}</TableCell><TableCell className="text-right tabular-nums">{r.available?formatNumber(r.received):"—"}</TableCell><TableCell className="text-right tabular-nums">{r.available?formatNumber(r.wastage):"—"}</TableCell><TableCell className="text-right tabular-nums">{r.available?rate(r.received,r.wastage):"No complete data"}</TableCell></TableRow>)}</TableBody></Table>
  <OperationalList ariaLabel="Wastage comparison">{rows.map(r=><OperationalListRow key={r.id} href={r.href??undefined} primary={r.name} secondary={`Received ${r.available?formatNumber(r.received):"—"} · Wastage ${r.available?formatNumber(r.wastage):"—"}`} status={r.available?rate(r.received,r.wastage):"—"}/>)}</OperationalList>
  {!rows.length?<p className="p-4 text-sm text-muted-foreground">No completed food records in this period.</p>:null}
 </section>;
}
