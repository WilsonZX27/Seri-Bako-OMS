"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ComplianceCalendarEvent = {
  id: string;
  date: string;
  title: string;
  context: string;
  href: string;
  state: string;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function cursorOf(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function eventTone(state: string) {
  return ["expired", "due_7"].includes(state) ? "bg-[var(--sb-danger)]" : "bg-[var(--sb-warning)]";
}

export function ComplianceMonthCalendar({ baseHref, month, events }: { baseHref: string; month?: string; events: ComplianceCalendarEvent[] }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const cursor = cursorOf(month);
  const monthHref = (value: string) => `${baseHref}${baseHref.includes("?") ? "&" : "?"}month=${value}`;
  const go = (date: Date) => router.push(monthHref(monthKey(date)));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "p") go(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "n") go(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
      if (event.key.toLowerCase() === "t") go(new Date());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const leading = (cursor.getDay() + 6) % 7;
  const prefix = monthKey(cursor);
  const today = new Date();
  const todayKey = `${monthKey(today)}-${String(today.getDate()).padStart(2, "0")}`;
  const byDay = new Map<number, ComplianceCalendarEvent[]>();
  events.filter((event) => event.date.startsWith(prefix)).forEach((event) => {
    const day = Number(event.date.slice(8, 10));
    byDay.set(day, [...(byDay.get(day) ?? []), event]);
  });
  const cells = Array.from({ length: leading + days }, (_, index) => index < leading ? null : index - leading + 1);
  while (cells.length % 7) cells.push(null);

  return <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-raised)]" aria-label="Monthly compliance calendar">
    <header className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b px-2 py-2 sm:px-3">
      <Button variant="outline" size="sm" className="shrink-0 border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100" onClick={() => go(new Date())}>Today</Button>
      <div className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center justify-self-center">
        <Button variant="ghost" size="icon" onClick={() => go(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
        <input aria-label="Choose year and month" type="month" value={prefix} onChange={(event) => event.target.value && router.push(monthHref(event.target.value))} className="h-10 min-w-0 w-full border-0 bg-transparent text-center text-sm font-semibold sm:w-44" />
        <Button variant="ghost" size="icon" onClick={() => go(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <span className="w-[4.5rem]" aria-hidden="true" />
    </header>
    <div className="grid grid-cols-7 border-b bg-[var(--sb-surface-muted)]">{weekdays.map((weekday) => <div key={weekday} className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground sm:text-xs">{weekday}</div>)}</div>
    <div className="grid grid-cols-7">{cells.map((day, index) => {
      const dayEvents = day ? byDay.get(day) ?? [] : [];
      const dateKey = day ? `${prefix}-${String(day).padStart(2, "0")}` : "";
      return <div key={index} className={cn("min-h-16 border-b border-r border-[var(--sb-border-soft)] p-1 sm:min-h-28 sm:p-2", !day && "bg-[var(--sb-surface-muted)]/45")}>
        {day ? <>
          <button type="button" onClick={() => setSelectedDate(dateKey)} aria-label={`${dateKey}, ${dayEvents.length} events`} aria-pressed={selectedDate === dateKey} className={cn("ml-auto flex h-10 w-full items-center justify-end rounded px-2 text-xs tabular-nums", dateKey === todayKey && "font-bold text-[var(--sb-green-800)]", selectedDate === dateKey && "bg-[var(--sb-green-100)] ring-1 ring-inset ring-[var(--sb-green-700)]")}>{day}</button>
          {dayEvents.length ? <>
            <div className="mt-1 flex flex-wrap justify-end gap-1 sm:hidden">{dayEvents.slice(0, 3).map((event) => <Link key={event.id} href={event.href} aria-label={`${event.title}: ${event.context}`} className={cn("h-2.5 w-2.5 rounded-full ring-2 ring-white", eventTone(event.state))} />)}{dayEvents.length > 3 ? <span className="text-[9px] font-semibold text-muted-foreground">+{dayEvents.length - 3}</span> : null}</div>
            <div className="mt-1 hidden space-y-1 sm:block">{dayEvents.slice(0, 2).map((event) => <Link key={event.id} href={event.href} className="block min-h-10 rounded-[2px] bg-[var(--sb-surface-muted)] px-1.5 py-1 text-[10px] leading-3 hover:bg-[var(--sb-green-50)]"><span className="flex items-center gap-1"><i className={cn("h-1.5 w-1.5 shrink-0 rounded-full", eventTone(event.state))} /><strong className="truncate">{event.title}</strong></span><span className="mt-0.5 block truncate text-muted-foreground">{event.context}</span></Link>)}</div>
          </> : null}
        </> : null}
      </div>;
    })}</div>
    <section className="border-t p-3" aria-label="Selected day events" aria-live="polite">
      <h3 className="mb-2 text-sm font-semibold">{selectedDate ?? "Select a day"}</h3>
      {selectedDate ? events.filter(event => event.date === selectedDate).length ? <ul className="divide-y">{events.filter(event => event.date === selectedDate).map(event => <li key={event.id}><Link href={event.href} className="block min-h-11 py-2"><strong className="block text-xs">{event.title}</strong><span className="text-xs text-muted-foreground">{event.context}</span></Link></li>)}</ul> : <p className="text-xs text-muted-foreground">No events on this day.</p> : <p className="text-xs text-muted-foreground">Choose a date to see its events here.</p>}
    </section>
  </section>;
}
