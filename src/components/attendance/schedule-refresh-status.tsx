"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { readJsonResponse } from "@/lib/http/read-json-response";

type Day = {staff_id:string;work_date:string;status:string;source_revision:number;calculated_revision:number|null};
export function ScheduleRefreshStatus({week,branch,canRefresh}:{week:string;branch?:string|null;canRefresh:boolean}) {
  const [days,setDays]=useState<Day[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
  const read=useCallback(async(signal?:AbortSignal)=>{
    const query=new URLSearchParams({week});if(branch)query.set("branch",branch);
    const response=await fetch(`/api/attendance/schedule-refresh?${query}`,{signal});
    const result=await readJsonResponse<{ok:boolean;days?:Day[];message?:string}>(response,{unexpectedResponse:"Calculation status is unavailable."});
    if(!response.ok||!result.ok)throw new Error(result.message??"Calculation status is unavailable.");
    setDays(result.days??[]);setError(null);return result.days??[];
  },[week,branch]);
  const refresh=useCallback(async(signal?:AbortSignal)=>{
    setBusy(true);
    try{
      const response=await fetch("/api/attendance/schedule-refresh",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({week,branch:branch??null}),signal});
      const result=await readJsonResponse<{ok:boolean;message?:string}>(response,{unexpectedResponse:"Calculation could not finish."});
      if(!response.ok||!result.ok)throw new Error(result.message??"Calculation could not finish.");
      await read(signal);
    }finally{setBusy(false);}
  },[week,branch,read]);
  useEffect(()=>{
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
    const check=async()=>{
      try{
        const current=await read(controller.signal);
        if(canRefresh&&current.some(day=>day.status==="pending"))await refresh(controller.signal);
        if(!controller.signal.aborted&&current.some(day=>["pending","running"].includes(day.status)))timer=setTimeout(()=>void check(),5000);
      }catch(cause){if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:"Calculation status is unavailable.");}
    };
    void check();return()=>{controller.abort();if(timer)clearTimeout(timer);};
  },[read,refresh,canRefresh]);
  if(!days.length&&!error)return null;
  const pending=days.filter(day=>["pending","running"].includes(day.status)).length;
  const failed=days.filter(day=>day.status==="failed").length;
  const reviewed=days.filter(day=>day.status==="needs_review").length;
  const waiting=days.filter(day=>day.status==="waiting_punches").length;
  return <div className="space-y-2 rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] p-3 text-xs" aria-label="Schedule attendance calculation">
    <p className="font-semibold">Schedule comparison</p>
    <p role="status">{busy?"Calculating changed staff days…":`${days.filter(day=>day.status==="ready").length} up to date${pending?` · ${pending} pending`:""}${failed?` · ${failed} failed`:""}`}</p>
    {waiting?<p>{waiting} staff days await imported punches.</p>:null}
    {reviewed?<p className="text-amber-800">{reviewed} staff days need review. Protected results stay unchanged.</p>:null}
    {reviewed?<details><summary className="cursor-pointer">Review dates</summary><p className="mt-1">{[...new Set(days.filter(day=>day.status==="needs_review").map(day=>day.work_date))].join(", ")}</p></details>:null}
    {error?<p role="alert">{error}</p>:null}
    {canRefresh&&(failed||pending||error)?<Button size="sm" variant="outline" disabled={busy} onClick={()=>void refresh().catch(cause=>setError(cause instanceof Error?cause.message:"Calculation could not finish."))}>Retry calculation</Button>:null}
  </div>;
}
