"use client";

import { useState } from "react";
import { ArrowRight, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";

type Option = { id: string; branch_name?: string };

export function MappingAdmin({ branches, devices }: { branches: Option[]; devices: Array<Record<string, unknown>> }) {
  const [message, setMessage] = useState("");

  async function saveMapping(sourceCode:string,branchId:string,active:boolean){
    const response=await fetch("/api/attendance/mappings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"device",sourceCode,branchId,active})});
    const result=await response.json() as {ok:boolean;message?:string};setMessage(result.ok?(active?"Mapping saved.":"Source unbound. Historical imports are unchanged."):result.message??"Mapping failed.");if(result.ok)window.location.reload();
  }

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    await saveMapping(String(data.get("sourceCode")),String(data.get("branchId")),true);
  }

  return <section className="min-w-0">
    <div className="sb-work-surface p-4">
      <h2 className="text-sm font-semibold">NGTeco Source <ArrowRight className="mx-1 inline h-3.5 w-3.5" aria-hidden="true" /> Outlet</h2>
      <p className="mt-1 text-xs text-muted-foreground">Link the Source value in the export to the outlet where that device is installed.</p>
      <form className="mt-4 grid min-w-0 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
        <label className="grid gap-1 text-xs font-medium">NGTeco Source<Input name="sourceCode" required maxLength={100} /></label>
        <label className="grid gap-1 text-xs font-medium">Outlet<select name="branchId" required className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Select outlet</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}</select></label>
        <Button type="submit" className="h-10 min-w-20 px-4">Link</Button>
      </form>
      <div className="mt-4 divide-y text-xs">{devices.map((row) => { const branch = row.branches as { branch_name?: string } | null;const source=String(row.source_code),branchId=String(row.branch_id),active=Boolean(row.is_active); return <div key={String(row.id)} className="grid gap-2 py-2 sm:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1.4fr)_auto] sm:items-center"><div><span className="font-mono">{source}</span>{!active?<StatusBadge status="inactive"/>:null}</div><label className="sr-only" htmlFor={`mapping-${row.id}`}>Outlet for {source}</label><select id={`mapping-${row.id}`} disabled={!active} defaultValue={branchId} className="h-9 rounded-[var(--sb-radius-control)] border bg-white px-2" onChange={event=>{const next=event.target.value;if(next!==branchId&&window.confirm(`Move ${source} from ${branch?.branch_name??"its current outlet"} to the selected outlet? Historical imports will stay unchanged.`))void saveMapping(source,next,true)}}>{branches.map(item=><option key={item.id} value={item.id}>{item.branch_name}</option>)}</select><Button size="sm" variant="outline" disabled={!active} onClick={()=>{if(window.confirm(`Unbind ${source} from ${branch?.branch_name??"this outlet"}? Historical imports will remain available.`))void saveMapping(source,branchId,false)}}><Link2Off className="h-3.5 w-3.5"/>Unbind</Button></div>; })}{!devices.length ? <p className="py-3 text-muted-foreground">No device sources linked yet.</p> : null}</div>
    </div>
    {message ? <p className="mt-3 text-xs text-muted-foreground" role="status">{message}</p> : null}
  </section>;
}
