"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ComplianceCalendarEvent={id:string;date:string;title:string;context:string;href:string;state:string};
const weekdays=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
function cursorOf(value?:string){const match=value?.match(/^(\d{4})-(\d{2})$/);const now=new Date();return match?new Date(Number(match[1]),Number(match[2])-1,1):new Date(now.getFullYear(),now.getMonth(),1)}
function monthKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`}

export function ComplianceMonthCalendar({baseHref,month,events}:{baseHref:string;month?:string;events:ComplianceCalendarEvent[]}){
 const router=useRouter(),cursor=cursorOf(month),go=(date:Date)=>router.push(`${baseHref}?month=${monthKey(date)}`);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;if(e.key==="ArrowLeft"||e.key.toLowerCase()==="p")go(new Date(cursor.getFullYear(),cursor.getMonth()-1,1));if(e.key==="ArrowRight"||e.key.toLowerCase()==="n")go(new Date(cursor.getFullYear(),cursor.getMonth()+1,1));if(e.key.toLowerCase()==="t")go(new Date())};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)});
 const days=new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate(),leading=(cursor.getDay()+6)%7,prefix=monthKey(cursor),byDay=new Map<number,ComplianceCalendarEvent[]>();
 events.filter(e=>e.date.startsWith(prefix)).forEach(e=>{const d=Number(e.date.slice(8,10));byDay.set(d,[...(byDay.get(d)??[]),e])});const cells=Array.from({length:leading+days},(_,i)=>i<leading?null:i-leading+1);while(cells.length%7)cells.push(null);
 return <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-raised)]" aria-label="Monthly compliance calendar">
  <header className="flex min-h-14 flex-wrap items-center gap-2 border-b px-3 py-2"><Button variant="outline" size="sm" onClick={()=>go(new Date())}>Today</Button><div className="flex items-center"><Button variant="ghost" size="icon" onClick={()=>go(new Date(cursor.getFullYear(),cursor.getMonth()-1,1))} aria-label="Previous month"><ChevronLeft className="h-4 w-4"/></Button><Button variant="ghost" size="icon" onClick={()=>go(new Date(cursor.getFullYear(),cursor.getMonth()+1,1))} aria-label="Next month"><ChevronRight className="h-4 w-4"/></Button></div><h2 className="min-w-36 text-sm font-semibold">{cursor.toLocaleDateString("en-MY",{month:"long",year:"numeric"})}</h2><label className="ml-auto text-xs text-muted-foreground">Go to month <input type="month" value={prefix} onChange={e=>e.target.value&&router.push(`${baseHref}?month=${e.target.value}`)} className="ml-2 h-10 rounded-md border bg-background px-2 text-foreground"/></label></header>
  <div className="grid grid-cols-7 border-b bg-[var(--sb-surface-muted)]">{weekdays.map(x=><div key={x} className="px-1 py-2 text-center text-[10px] font-medium uppercase text-muted-foreground sm:text-xs">{x}</div>)}</div>
  <div className="grid grid-cols-7">{cells.map((day,index)=><div key={index} className={cn("min-h-20 border-b border-r p-1 sm:min-h-28 sm:p-2",!day&&"bg-[var(--sb-surface-muted)]/60")}>{day?<><span className="block text-right text-[11px] tabular-nums text-muted-foreground">{day}</span><div className="mt-1 space-y-1">{(byDay.get(day)??[]).slice(0,2).map(event=><Link key={event.id} href={event.href} className="block min-h-10 rounded-[2px] bg-[var(--sb-surface-muted)] px-1.5 py-1 text-[10px] leading-3 hover:bg-[var(--sb-green-50)]"><span className="flex items-center gap-1"><i className={cn("h-1.5 w-1.5 shrink-0 rounded-full",["expired","due_7"].includes(event.state)?"bg-[var(--sb-danger)]":"bg-[var(--sb-warning)]")}/><strong className="truncate">{event.title}</strong></span><span className="mt-0.5 block truncate text-muted-foreground">{event.context}</span></Link>)}</div></>:null}</div>)}</div>
 </section>
}
