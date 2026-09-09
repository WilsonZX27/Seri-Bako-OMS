"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";
import { attendanceTimeOptions } from "@/lib/attendance/time";

function seconds(value: FormDataEntryValue | null) { const [h,m]=String(value).split(":").map(Number); return h*3600+m*60; }
const field="grid gap-1 text-xs";
const timeOptions=attendanceTimeOptions();

function TimeField({name,required=false}:{name:string;required?:boolean}) {
  return <select name={name} required={required} className="h-10 rounded-md border bg-background px-3">
    {!required?<option value="">Use scheduled time</option>:null}
    {timeOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
  </select>;
}

export function TemplateAdmin({branchId}:{branchId:string}) {
  const [message,setMessage]=useState("");
  async function submit(form:HTMLFormElement){
    const data=new FormData(form), start=String(data.get("start")), end=String(data.get("end"));
    const checkInStart=String(data.get("checkInStart")||start), checkOutEnd=String(data.get("checkOutEnd")||end);
    const before=seconds(start)-seconds(checkInStart), after=seconds(checkOutEnd)-seconds(end);
    if(before<0||after<0){setMessage("The punch window must start before check-in and finish after check-out.");return}
    const response=await fetch("/api/attendance/schedule",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"template",code:data.get("code"),name:data.get("name"),checkInStart,start,end,checkOutEnd,crossesMidnight:data.get("crossesMidnight")==="on",breakSeconds:Number(data.get("breakMinutes"))*60,capSeconds:Number(data.get("capMinutes"))*60,branchIds:[branchId],colour:String(data.get("colour")),otEligible:data.get("otEligible")==="on",graceSeconds:Number(data.get("graceSeconds")),matchBeforeSeconds:before,matchAfterSeconds:after,overtimeRule:{mode:data.get("otEligible")==="on"?"approved_only":"disabled",threshold_seconds:Number(data.get("otThresholdMinutes"))*60,maximum_seconds:Number(data.get("maxOtMinutes"))*60,rounding_minutes:Number(data.get("otRoundingMinutes"))},reason:data.get("reason")||null})});
    const result=await response.json() as {ok:boolean;message?:string}; setMessage(result.ok?"Shift saved and ready to use.":result.message??"Shift could not be saved."); if(result.ok)window.location.reload();
  }
  return <section className="sb-work-surface overflow-hidden"><header className="border-b px-4 py-3"><h2 className="text-sm font-semibold">New shift</h2><p className="mt-0.5 text-xs text-muted-foreground">Full-time shifts pay 8.5 hours; a schedule span over 9.5 hours is Full-day and pays 9.5 hours. Part-time work is floored once per day to complete 30-minute blocks after unpaid breaks.</p></header>
    <form id="shift-template-form" className="space-y-4 p-4 pb-24 md:pb-4" onSubmit={e=>{e.preventDefault();void submit(e.currentTarget)}}>
      <div className="grid grid-cols-2 gap-3"><label className={field}>Short code<Input name="code" required maxLength={20} placeholder="A"/></label><label className={field}>Shift name<Input name="name" required maxLength={100} placeholder="Opening shift"/></label><label className={field}>Check in<TimeField name="start" required/></label><label className={field}>Check out<TimeField name="end" required/></label><label className={field}>Break (minutes)<Input name="breakMinutes" type="number" min={0} max={720} defaultValue={60} required/></label><label className={field}>Maximum paid time (minutes)<Input name="capMinutes" type="number" min={1} max={1440} defaultValue={510} required/></label></div>
      <details className="group rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] px-3"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between py-3 text-xs font-semibold text-[var(--sb-link)] [&::-webkit-details-marker]:hidden">Advanced punch and OT rules<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180"/></summary><div className="border-t border-[var(--sb-border-soft)] py-3"><p className="mb-3 text-xs text-muted-foreground">Use these only when the accepted punch window or approved OT differs from the scheduled hours.</p><div className="grid grid-cols-2 gap-3"><label className={field}>Earliest accepted check-in<TimeField name="checkInStart"/></label><label className={field}>Latest accepted check-out<TimeField name="checkOutEnd"/></label><label className={field}>Late grace (seconds)<Input name="graceSeconds" type="number" min={0} max={7200} defaultValue={0} required/></label><label className={field}>OT starts after (minutes)<Input name="otThresholdMinutes" type="number" min={0} max={1440} defaultValue={0} required/></label><label className={field}>Maximum approved OT (minutes)<Input name="maxOtMinutes" type="number" min={0} max={1440} defaultValue={0} required/></label><label className={field}>OT rounding<select name="otRoundingMinutes" className="h-10 rounded-md border bg-background px-3"><option value="1">Exact minute</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option></select></label><label className={field}>Colour<Input name="colour" type="color" defaultValue="#247a4a"/></label><div className="grid content-start gap-2"><label className="flex min-h-9 items-center gap-2 text-xs"><input name="crossesMidnight" type="checkbox"/>Crosses midnight</label><label className="flex min-h-9 items-center gap-2 text-xs"><input name="otEligible" type="checkbox"/>Approved OT eligible</label></div><label className={`${field} sm:col-span-2`}>Reason for non-standard time<Input name="reason" maxLength={500}/></label></div></div></details>
      <div data-template-mobile-actions className="flex flex-wrap items-center gap-3 border-t p-3 md:border-0 md:p-0"><Button type="submit" className="min-h-10 flex-1 md:flex-none">Save shift</Button><p className="text-xs text-muted-foreground" role="status">{message}</p></div>
    </form>
  </section>;
}
