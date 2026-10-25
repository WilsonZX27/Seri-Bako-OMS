"use client";

import { useRef, useState } from "react";
import { requestDeadline } from "@/lib/http/request-deadline";
import { readJsonResponse } from "@/lib/http/read-json-response";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";
import { attendanceTimeOptions } from "@/lib/attendance/time";
import { SelectControl } from "@/components/ui/select-control";

function seconds(value: FormDataEntryValue | null) { const [h,m]=String(value).split(":").map(Number); return h*3600+m*60; }
const field="grid min-w-0 grid-rows-[1fr_auto] gap-1 text-xs";
const timeOptions=attendanceTimeOptions();

function TimeField({name,required=false}:{name:string;required?:boolean}) {
  const options=required?timeOptions:[{value:"scheduled",label:"Use scheduled time"},...timeOptions];
  return <SelectControl name={name} ariaLabel={name} required={required} defaultValue={required?timeOptions[0]?.value:"scheduled"} options={options}/>;
}

export function TemplateAdmin({branchId}:{branchId:string}) {
  const [message,setMessage]=useState("");
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  async function submit(form:HTMLFormElement){
    if (pendingRef.current) return;
    const data=new FormData(form), start=String(data.get("start")), end=String(data.get("end"));
    const checkInStart=String(data.get("checkInStart")==="scheduled"?start:data.get("checkInStart")||start), checkOutEnd=String(data.get("checkOutEnd")==="scheduled"?end:data.get("checkOutEnd")||end);
    const before=seconds(start)-seconds(checkInStart), after=seconds(checkOutEnd)-seconds(end);
    if(before<0||after<0){setMessage("The punch window must start before check-in and finish after check-out.");return}
    pendingRef.current = true;
    setPending(true);
    setMessage("");
    try {
    const {response, result} = await requestDeadline(async signal => {
    const response=await fetch("/api/attendance/schedule",{signal,method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"template",code:data.get("code"),name:data.get("name"),checkInStart,start,end,checkOutEnd,crossesMidnight:data.get("crossesMidnight")==="on",breakSeconds:Number(data.get("breakMinutes"))*60,capSeconds:Number(data.get("capMinutes"))*60,branchIds:[branchId],colour:String(data.get("colour")),otEligible:data.get("otEligible")==="on",graceSeconds:Number(data.get("graceSeconds")),matchBeforeSeconds:before,matchAfterSeconds:after,overtimeRule:{mode:data.get("otEligible")==="on"?"approved_only":"disabled",threshold_seconds:Number(data.get("otThresholdMinutes"))*60,maximum_seconds:Number(data.get("maxOtMinutes"))*60,rounding_minutes:Number(data.get("otRoundingMinutes"))},reason:data.get("reason")||null})});
    const result=await readJsonResponse<{ok:boolean;message?:string}>(response, {
      sessionExpired: "Your session expired. Sign in again, then check the shift list before trying again. Your inputs are retained.",
      unexpectedResponse: "Save result could not be confirmed. Your inputs are retained. Check the shift list before trying again.",
      invalidJson: "Save result could not be confirmed. Your inputs are retained. Check the shift list before trying again.",
    });
    return {response, result};
    }, 60_000, "Save result could not be confirmed. The server may have saved the shift. Your inputs are retained. Check the shift list before trying again.");
    setMessage(response.ok && result.ok?"Shift saved and ready to use.":result.message??"Shift could not be saved."); if(response.ok && result.ok)window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error && !(error instanceof TypeError) ? error.message : "Save result could not be confirmed. Your inputs are retained. Check the shift list before trying again.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }
  return <section className="overflow-hidden">
    <form aria-busy={pending} id="shift-template-form" className="space-y-4 p-4 pb-24 md:pb-4" onSubmit={e=>{e.preventDefault();void submit(e.currentTarget)}}>
      <div className="grid grid-cols-2 gap-3"><label className={field}>Short code<Input name="code" required maxLength={20} placeholder="A"/></label><label className={field}>Shift name<Input name="name" required maxLength={100} placeholder="Opening shift"/></label><label className={field}>Check in<TimeField name="start" required/></label><label className={field}>Check out<TimeField name="end" required/></label><label className={field}>Break (minutes)<Input name="breakMinutes" type="number" min={0} max={720} defaultValue={60} required/></label><label className={field}>Maximum paid time (minutes)<Input name="capMinutes" type="number" min={1} max={1440} defaultValue={510} required/></label></div>
      <details className="group rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] px-3"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between py-3 text-xs font-semibold text-[var(--sb-link)] [&::-webkit-details-marker]:hidden">Advanced punch and OT rules<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180"/></summary><div className="border-t border-[var(--sb-border-soft)] py-3"><p className="mb-3 text-xs text-muted-foreground">Use these only when the accepted punch window or approved OT differs from the scheduled hours.</p><div className="grid grid-cols-2 gap-3"><label className={field}>Earliest accepted check-in<TimeField name="checkInStart"/></label><label className={field}>Latest accepted check-out<TimeField name="checkOutEnd"/></label><label className={field}>Late grace (seconds)<Input name="graceSeconds" type="number" min={0} max={7200} defaultValue={0} required/></label><label className={field}>OT starts after (minutes)<Input name="otThresholdMinutes" type="number" min={0} max={1440} defaultValue={0} required/></label><label className={field}>Maximum approved OT (minutes)<Input name="maxOtMinutes" type="number" min={0} max={1440} defaultValue={0} required/></label><label className={field}>OT rounding<SelectControl name="otRoundingMinutes" ariaLabel="OT rounding" defaultValue="1" options={[{value:"1",label:"Exact minute"},{value:"5",label:"5 minutes"},{value:"10",label:"10 minutes"},{value:"15",label:"15 minutes"},{value:"30",label:"30 minutes"}]}/></label><label className={field}>Colour<Input name="colour" type="color" defaultValue="#247a4a"/></label><div className="grid content-start gap-2"><label className="flex min-h-9 items-center gap-2 text-xs"><input name="crossesMidnight" type="checkbox"/>Crosses midnight</label><label className="flex min-h-9 items-center gap-2 text-xs"><input name="otEligible" type="checkbox"/>Approved OT eligible</label></div><label className={`${field} sm:col-span-2`}>Reason for non-standard time<Input name="reason" maxLength={500}/></label></div></div></details>
      <div data-template-mobile-actions className="flex flex-wrap items-center gap-3 border-t p-3 md:border-0 md:p-0"><Button type="submit" disabled={pending} className="min-h-10 flex-1 md:flex-none">{pending ? "Saving shift..." : "Save shift"}</Button>{message ? <p className="w-full text-xs text-muted-foreground" role="status">{message}</p> : null}</div>
    </form>
  </section>;
}
