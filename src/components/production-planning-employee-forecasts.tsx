"use client";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { PlanningBranch, PlanningProduct } from "@/lib/production-planning/types";
import { parseForecastCsv } from "@/lib/production-planning/forecast-csv";
import { useState } from "react";

export type ForecastDraft = { weekday: string; weekend: string; source: string };
export function EmployeeForecastEditor({outlets,products,values,onChange,disabled}:{
  outlets:PlanningBranch[];products:PlanningProduct[];values:Record<string,ForecastDraft>;
  onChange:(values:Record<string,ForecastDraft>)=>void;disabled:boolean;
}) {
  const [outlet,setOutlet]=useState(outlets[0]?.id??"");
  const [notice,setNotice]=useState("");
  const [importError,setImportError]=useState("");
  const importReference=(text:string)=>{
    const matches=parseForecastCsv(text).map(row=>{
      const branches=outlets.filter(b=>b.branch_name===row.outlet),items=products.filter(p=>p.product_code===row.product_code);
      if(branches.length!==1||items.length!==1)throw new Error(`Cannot uniquely match ${row.outlet} / ${row.product_code} to this kitchen. No values imported.`);
      return {...row,key:`${branches[0].id}:${items[0].id}`};
    });
    const next={...values};let count=0;
    for(const row of matches){
      const old=next[row.key]??{weekday:"",weekend:"",source:""};
      const weekday=old.weekday!==""?old.weekday:row.weekday_qty===null?"":String(row.weekday_qty);
      const weekend=old.weekend!==""?old.weekend:row.weekend_qty===null?"":String(row.weekend_qty);
      if(weekday!==old.weekday||weekend!==old.weekend){next[row.key]={weekday,weekend,source:"Employee forecast CSV"};count++;}
    }
    onChange(next);setNotice(`${count} matched outlet/product rows filled in this draft. Existing values kept. Blank source cells stay unknown. Save settings to apply.`);
  };
  const edit=(product:string,field:"weekday"|"weekend",value:string)=>{
    const key=`${outlet}:${product}`;
    onChange({...values,[key]:{...(values[key]??{weekday:"",weekend:""}),[field]:value,source:"Manager edited"}});
  };
  return <section className="sb-work-surface p-4">
    <h2 className="text-sm font-semibold">Employee weekday & weekend forecasts</h2>
    <p className="mt-1 max-w-prose text-xs text-muted-foreground">Expected daily demand per outlet. Blank means unknown; 0 means no recurring demand. Odd numbers are allowed. Suggestions use eligible history and prefer pairs within demand limits.</p>
    <div className="my-3 flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 text-xs sm:max-w-sm">Forecast outlet<SelectControl value={outlet} onValueChange={setOutlet} ariaLabel="Employee forecast outlet" options={outlets.map(b=>({value:b.id,label:b.branch_name}))}/></label>
      <label className="min-w-0 text-xs">Import employee forecasts CSV<Input type="file" accept=".csv,text/csv" disabled={disabled} aria-label="Import employee forecasts CSV" onChange={async event=>{const file=event.target.files?.[0];event.target.value="";if(!file)return;setImportError("");setNotice("");try{if(file.size>1_000_000)throw new Error("Forecast CSV must be smaller than 1 MB.");importReference(await file.text());}catch(error){setImportError(error instanceof Error?error.message:"Could not read forecast CSV.");}}}/></label>
    </div>
    {notice?<p className="mb-3 text-xs" role="status">{notice}</p>:null}
    {importError?<p className="mb-3 text-xs text-red-700" role="alert">{importError}</p>:null}
    {!outlets.length?<p className="text-sm">Configure this kitchen’s outlet supply routes first.</p>:<div className="max-h-[32rem] overflow-auto">
      <Table className="min-w-[30rem] table-fixed text-xs"><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="w-28">Weekday</TableHead><TableHead className="w-28">Weekend</TableHead></TableRow></TableHeader>
      <TableBody>{products.map(p=>{const row=values[`${outlet}:${p.id}`];return <TableRow key={p.id}>
        <TableCell><span className="text-muted-foreground">{p.product_code}</span><span className="block whitespace-normal break-words">{p.product_name}</span></TableCell>
        {(["weekday","weekend"] as const).map(field=><TableCell key={field}><Input type="number" min="0" max="1000000" step="1" disabled={disabled} placeholder="—" aria-label={`${p.product_name} ${field} forecast`} value={row?.[field]??""} onChange={e=>edit(p.id,field,e.target.value)}/></TableCell>)}
      </TableRow>;})}</TableBody></Table>
    </div>}
    <p className="mt-3 text-xs text-muted-foreground">CSV columns: outlet, product_code, weekday_qty, weekend_qty. Names and codes must match this kitchen. Existing values are kept; clear a field first to replace it. Saving a forecast sets no fixed minimum unless one is already configured. Saved plans change only when recalculated.</p>
  </section>;
}
