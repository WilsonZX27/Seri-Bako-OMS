"use client";
import { useEffect, useRef, useState } from "react";
import { SelectControl } from "@/components/ui/select-control";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Action="run"|"restore";
export function FixedAttendanceRepair(){
  const [enabled,setEnabled]=useState(false),[checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false);
  const [action,setAction]=useState<Action>("run"),[completed,setCompleted]=useState<Action|null>(null),[message,setMessage]=useState("Checking availability…");
  const latch=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();
    void fetch("/api/attendance/recalculate",{cache:"no-store",credentials:"same-origin",signal:controller.signal}).then(async response=>{
      const data=await response.json();if(controller.signal.aborted)return;
      const ready=response.ok&&data.capability==="oms305-fixed-v3"&&data.enabled===true;
      setEnabled(ready);setMessage(ready?"Available to an authorised Owner or People account.":"This controlled operation is not enabled.");
    }).catch(()=>{if(!controller.signal.aborted)setMessage("Availability could not be checked. No operation was sent.");});
    return ()=>controller.abort();
  },[]);
  async function submit(){
    if(latch.current||!enabled||!checked||uncertain)return;
    latch.current=true;setBusy(true);setChecked(false);
    try{
      const response=await fetch("/api/attendance/recalculate",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({batchId:"34ffbb89-be58-4d74-b6ed-a8ab3a25cda5",repair:`oms305-20261019-v3/${action}`})});
      const data=await response.json();if(!response.ok)throw new Error(data.message??"Result is not confirmed. Check the receipt before retrying.");
      setCompleted(action);setMessage(`${action==="run"?"Repair":"Restoration"} completed for ${Number(data.calculated)} employee-days. Verify the independent receipt before closing maintenance.`);
      latch.current=false;
    }catch(error){setUncertain(true);setMessage(error instanceof Error?error.message:"Result is not confirmed. Check the receipt before retrying.");}
    finally{setBusy(false);}
  }
  const blocked=busy||uncertain||completed==="restore";
  return <Card><CardContent className="space-y-4">
    <p className="text-sm">19–25 October 2026 · 305 employee-days. 17–18 October is excluded. Raw punches and history are retained.</p>
    <p className="text-sm">Use only for the approved maintenance operation. Genuine missing punches remain subject to review.</p>
    <label className="flex flex-col gap-2 text-sm">Operation<SelectControl ariaLabel="Operation" value={action} disabled={blocked} onValueChange={value=>{setAction(value as Action);setChecked(false);}} options={[{value:"run",label:"Repair the fixed 305 days"},{value:"restore",label:"Restore original current versions"}]}/></label>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={checked} disabled={!enabled||blocked} onChange={event=>setChecked(event.target.checked)}/>I confirm this exact operation is approved.</label>
    <Button type="button" disabled={!enabled||!checked||blocked||(completed==="run"&&action==="run")} onClick={()=>void submit()}>{busy?"Processing…":action==="run"?"Repair fixed 305 days":"Restore original versions"}</Button>
    <p role="status" aria-live="polite" className="text-sm">{message}</p>
    {uncertain?<p className="text-sm">Do not submit again until the receipt and current versions have been checked.</p>:null}
  </CardContent></Card>;
}
