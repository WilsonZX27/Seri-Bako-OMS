import { shiftBusinessDate } from "@/lib/business-date";
import type { PackagingReport, PackagingUsageRow } from "@/server/queries/outlet-packaging";

/** Recorded balance as of each day, never a sum of changing daily-report cohorts. */
export function packagingTrendPoints(report:PackagingReport,outlet:string,product:string,days:7|30,measure:"usage"|"closing") {
 const uniqueRows = report.rows.filter((row,index,rows)=>!row.id || rows.findIndex(item=>item.id===row.id)===index);
 const start=shiftBusinessDate(report.today,1-days);
 const scope=(row:PackagingUsageRow)=>row.code===product&&(outlet==="all"||row.branchId===outlet);
 const count=outlet==="all"?report.outlets.length:1;
 const known=new Map<string,PackagingUsageRow>();
 for(const row of [...(report.opening??[]),...report.latest].filter(scope).filter(r=>r.date<start).sort((a,b)=>a.date.localeCompare(b.date)))known.set(row.branchId,row);
 const byDate=new Map<string,PackagingUsageRow[]>();
 for(const row of uniqueRows.filter(scope).filter(r=>r.date>=start&&r.date<=report.today))byDate.set(row.date,[...(byDate.get(row.date)??[]),row]);
 return Array.from({length:days},(_,index)=>{
  const date=shiftBusinessDate(report.today,index+1-days),daily=byDate.get(date)??[];
  for(const row of daily)known.set(row.branchId,row);
  const rows=measure==="usage"?daily:Array.from(known.values()).filter(r=>r.closing!=null);
  const complete=count>0&&new Set(rows.map(row=>row.branchId)).size===count;
  return {date,rows,updated:daily.length,value:measure==="usage"?(rows.length?rows.every(row=>row.usage!==null) ? rows.reduce((n,r)=>n+(r.usage ?? 0),0) : null:null):complete?rows.reduce((n,r)=>n+(r.closing??0),0):null};
 });
}
