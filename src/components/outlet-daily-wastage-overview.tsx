"use client";
import { insightDelta } from "@/lib/outlet-insight-period";
import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, OperationalList, OperationalListRow } from "@/components/ui/table";
import { Notice } from "@/components/ui/system-states";
import type { getOutletDailyDemandTrend } from "@/server/queries/outlet-daily-records";
type Trend = Pick<NonNullable<Awaited<ReturnType<typeof getOutletDailyDemandTrend>>>, "outlets" | "top_wastage_products">;
const rate = (received: number, wastage: number) => received > 0 ? `${new Intl.NumberFormat("en-MY", { maximumFractionDigits: 1 }).format(wastage / received * 100)}%` : "—";
export function OutletDailyWastageOverview({ trend, previous=null, view = "outlets" }: { trend: Trend | null; previous?: Trend | null; view?: "outlets" | "products" }) {
 const [sort,setSort]=useState<{key:"received"|"wastage"|"rate";descending:boolean}>({key:"wastage",descending:true});
 if (!trend) return <Notice tone="warning" title="Wastage insight unavailable">Reload this view to retry. Daily Records remain available in the first tab.</Notice>;
 const rows = view === "outlets" ? [...trend.outlets].sort((a,b)=>b.wastage-a.wastage).map(o=>({id:o.id,name:o.name,received:o.received,wastage:o.wastage,href:`/outlet-daily-records?branch=${o.id}`,available:!o.no_completed_records})) : trend.top_wastage_products.map(p=>({id:p.id,name:p.name,received:p.received,wastage:p.wastage,href:null,available:p.completed_records>0}));
 const previousRows=previous?(view==="outlets"?previous.outlets:previous.top_wastage_products):[];
 const change=(row:typeof rows[number])=>{const prior=previousRows.find(p=>p.id===row.id);const validPrior=prior&&("no_completed_records" in prior?!prior.no_completed_records:prior.completed_records>0);const delta=insightDelta(row.available?row.wastage:null,validPrior?prior.wastage:null);return delta?`${delta.absolute>0?"+":""}${formatNumber(delta.absolute)}${delta.percent===null?"":" ("+(delta.percent>0?"+":"")+formatNumber(delta.percent)+"%)"}`:"No comparison";};
 const value=(row:typeof rows[number])=>!row.available?null:sort.key==="rate"?(row.received>0?row.wastage/row.received:null):row[sort.key];
 rows.sort((a,b)=>{const av=value(a),bv=value(b);return av===null?(bv===null?a.name.localeCompare(b.name):1):bv===null?-1:(sort.descending?bv-av:av-bv)||a.name.localeCompare(b.name);});
 const heading=(key:typeof sort.key,label:string)=><TableHead className="text-right" aria-sort={sort.key===key?(sort.descending?"descending":"ascending"):"none"}><button type="button" className="inline-flex min-h-9 items-center gap-1" onClick={()=>setSort({key,descending:sort.key===key?!sort.descending:true})}>{label}{sort.key===key?(sort.descending?<ArrowDown className="h-3 w-3"/>:<ArrowUp className="h-3 w-3"/>):<ArrowUpDown className="h-3 w-3"/>}</button></TableHead>;
 return <section className="sb-list-content-card overflow-hidden" aria-label={view === "outlets" ? "Wastage by outlet" : "Wastage by product"}>
  <Table mobileHidden><TableHeader><TableRow><TableHead>{view === "outlets" ? "Outlet" : "Product"}</TableHead>{heading("received","Received")}{heading("wastage","Wastage")}{heading("rate","Rate")}{previous?<TableHead className="text-right">Wastage change</TableHead>:null}</TableRow></TableHeader><TableBody>{rows.map(r=><TableRow key={r.id}><TableCell>{r.href?<Link className="font-medium text-primary hover:underline" href={r.href}>{r.name}</Link>:r.name}</TableCell><TableCell className="text-right tabular-nums">{r.available?formatNumber(r.received):"—"}</TableCell><TableCell className="text-right tabular-nums">{r.available?formatNumber(r.wastage):"—"}</TableCell><TableCell className="text-right tabular-nums">{r.available?rate(r.received,r.wastage):"No complete data"}</TableCell>{previous?<TableCell className="text-right tabular-nums">{change(r)}</TableCell>:null}</TableRow>)}</TableBody></Table>
  <OperationalList ariaLabel="Wastage comparison">{rows.map(r=><OperationalListRow key={r.id} href={r.href??undefined} primary={r.name} secondary={`Received ${r.available?formatNumber(r.received):"—"} · Wastage ${r.available?formatNumber(r.wastage):"—"}`} status={r.available?rate(r.received,r.wastage):"—"} detail={previous?<p className="text-xs text-muted-foreground">Wastage change {change(r)}</p>:undefined}/>)}</OperationalList>
  {!rows.length?<p className="p-4 text-sm text-muted-foreground">No completed food records in this period.</p>:null}
 </section>;
}
