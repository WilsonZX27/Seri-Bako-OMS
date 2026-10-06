"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { InteractiveLineChart } from "@/components/ui/interactive-line-chart";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { readPlanningHistory, type PlanningHistoryRow } from "@/server/actions/production-planning";
import type { Allocation, PlanningBranch } from "@/lib/production-planning/types";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import { shiftBusinessDate } from "@/lib/business-date";

const metrics = [{id:"received",label:"Received"},{id:"leftover",label:"Leftover"},{id:"wastage",label:"Wastage"}] as const;
export function PlanningEvidence({planId,productId,kitchenId,date,allocations,outlets,unit}:{planId:string;productId:string;kitchenId:string;date:string;allocations:Allocation[];outlets:PlanningBranch[];unit:string}) {
 const [history,setHistory]=useState<PlanningHistoryRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 const available=allocations.filter(a=>a.product_id===productId);
 const [branch,setBranch]=useState(available[0]?.branch_id??""),[metric,setMetric]=useState<"received"|"leftover"|"wastage">("wastage"),[selectedDate,setSelectedDate]=useState<string|null>(null);
 const allocation=available.find(a=>a.branch_id===branch)??available[0];
 const rows=history.filter(h=>h.branchId===allocation?.branch_id).sort((a,b)=>b.date.localeCompare(a.date));
 const num=(value:number|null|undefined)=>value==null?"—":formatNumber(value);
 useEffect(()=>{let active=true;setLoading(true);setError("");void readPlanningHistory(planId,productId).then(result=>{if(!active)return;setLoading(false);if(result.ok)setHistory(result.rows);else setError(result.message);}).catch(()=>{if(active){setLoading(false);setError("History unavailable. Please retry.");}});return()=>{active=false;};},[planId,productId,retry]);
 const byDate=new Map(rows.map(row=>[row.date,row]));
 const points=Array.from({length:56},(_,i)=>{const day=shiftBusinessDate(date,i-56),row=byDate.get(day);return {id:day,label:formatDateOnly(day),value:row?.[metric]??null,previewValue:row?num(row[metric]):"No completed record",previewDetails:row?[`Received ${num(row.received)} · Leftover ${num(row.leftover)} · Wastage ${num(row.wastage)}`]:[]};});
 const selected=selectedDate?byDate.get(selectedDate):rows[0];
 return <div className="space-y-3">
  <div className="flex flex-wrap items-center justify-between gap-2"><SelectNative aria-label="Evidence outlet" className="w-full sm:max-w-80" value={allocation?.branch_id??""} onChange={e=>{setBranch(e.target.value);setSelectedDate(null);}}>{available.map(a=><option key={a.branch_id} value={a.branch_id}>{outlets.find(o=>o.id===a.branch_id)?.branch_name??"Outlet"}</option>)}</SelectNative><span className="text-xs text-muted-foreground">8 weeks · completed records</span></div>
  <div className="grid grid-cols-3 divide-x border-y py-3 text-xs">{[["Suggestion",num(allocation?.suggested_qty)],["Minimum",num(allocation?.minimum_qty)],["Mode",allocation?.evidence.method==="manual"?"Manual":"Automatic"]].map(([label,value])=><div key={label} className="px-3 first:pl-0"><span className="text-muted-foreground">{label}</span><strong className="mt-1 block text-base tabular-nums">{value}</strong></div>)}</div>
  {allocation?.evidence.method==="manual"?<p className="text-xs text-amber-800">{allocation.evidence.manualReason?.startsWith("Multi-day")?"Manager quantity required · same-day use not confirmed.":"Manager quantity required · insufficient eligible history."}</p>:<p className="text-xs text-muted-foreground">Saved calculation · {allocation?.evidence.evidence.length??0} observations</p>}
  {error?<div role="alert" className="flex flex-wrap items-center gap-3 text-sm"><p>{error}</p><Button variant="outline" onClick={()=>setRetry(v=>v+1)}>Retry history</Button></div>:loading?<div className="flex h-56 items-center justify-center bg-muted/20 text-sm" role="status">Loading history…</div>:rows.length?<>
   <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Daily trend <span className="font-normal text-muted-foreground">{unit}</span></h3><div className="flex gap-1" aria-label="History measure">{metrics.map(m=><Button key={m.id} size="sm" variant={metric===m.id?"secondary":"ghost"} aria-pressed={metric===m.id} onClick={()=>setMetric(m.id)}>{m.label}</Button>)}</div></div>
   <div className="h-52 sm:h-60" key={`${allocation?.branch_id}:${metric}`}><InteractiveLineChart compact tone={metric==="wastage"?"danger":"primary"} width={900} height={240} inset={{top:16,right:16,bottom:28,left:40}} maximum={Math.max(1,...points.map(p=>p.value??0))} ariaLabel={`${metrics.find(m=>m.id===metric)?.label} history`} onSelectPoint={setSelectedDate} points={points}/></div>
   <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y py-3 text-xs" aria-live="polite">{selected?<><Link className="font-medium underline" href={`/outlet-daily-records/${selected.recordId}`}>{formatDateOnly(selected.date)} · Open record</Link><span>Received <strong>{num(selected.received)}</strong></span><span>Leftover <strong>{num(selected.leftover)}</strong></span><span>Wastage <strong>{num(selected.wastage)}</strong></span></>:<span>{selectedDate?formatDateOnly(selectedDate):"Select a day"} · No completed record</span>}</div>
   <details><summary className="min-h-11 cursor-pointer py-3 text-xs font-medium">All records · {rows.length}</summary><div className="max-h-72 overflow-auto"><Table className="text-xs"><TableHeader><TableRow>{["Date","Received","Leftover","Wastage"].map(v=><TableHead key={v}>{v}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map(h=><TableRow key={h.recordId}><TableCell><Link className="underline" href={`/outlet-daily-records/${h.recordId}`}>{formatDateOnly(h.date)}</Link></TableCell><TableCell>{num(h.received)}</TableCell><TableCell>{num(h.leftover)}</TableCell><TableCell>{num(h.wastage)}</TableCell></TableRow>)}</TableBody></Table></div></details>
  </>:<p className="py-8 text-center text-sm">No completed history. <Link className="underline" href={`/outlet-daily-records?branch=${allocation?.branch_id??""}`}>Check Daily Records</Link></p>}
  <details className="border-t text-xs"><summary className="min-h-11 cursor-pointer py-3 font-medium">How to enable suggestions</summary><p className="max-w-prose pb-3">Set tray yield, confirm same-day use and outlet minimums. Demand needs 3 matching weekdays or 5 comparable days in 14 days. Multi-day products need stock or sales data; enter a manager quantity meanwhile.</p><Link className="inline-block pb-3 underline" href={`/production/planning?date=${date}&kitchen=${kitchenId}&view=settings`}>Open Settings</Link>{allocation?.evidence.evidence.length?<p className="pb-3">Saved movement {num(allocation.evidence.weightedMovement)} · Reduction floor {num(allocation.evidence.reductionFloor)} · {allocation.evidence.excluded} excluded</p>:null}<p className="pb-3 text-muted-foreground">Live history does not change saved suggestions. Gaps / — mean missing data; event days may be excluded from calculation.</p></details>
 </div>;
}
