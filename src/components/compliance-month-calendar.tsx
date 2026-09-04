"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
  const cursor = cursorOf(month);
  const go = (date: Date) => router.push(`${baseHref}?month=${monthKey(date)}`);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
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
    <header className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-b px-2 py-2 sm:flex sm:px-3">
      <Button variant="outline" size="sm" className="shrink-0" onClick={() => go(new Date())}>Today</Button>
      <div className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center sm:flex sm:flex-1 sm:justify-center">
        <Button variant="ghost" size="icon" onClick={() => go(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
        <h2 className="truncate text-center text-sm font-semibold sm:min-w-44">{cursor.toLocaleDateString("en-MY", { month: "long", year: "numeric" })}</h2>
        <Button variant="ghost" size="icon" onClick={() => go(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <label className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground sm:flex">Go to month <input type="month" value={prefix} onChange={(event) => event.target.value && router.push(`${baseHref}?month=${event.target.value}`)} className="h-10 rounded-md border bg-background px-2 text-foreground" /></label>
    </header>
    <div className="grid grid-cols-7 border-b bg-[var(--sb-surface-muted)]">{weekdays.map((weekday) => <div key={weekday} className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground sm:text-xs">{weekday}</div>)}</div>
    <div className="grid grid-cols-7">{cells.map((day, index) => {
      const dayEvents = day ? byDay.get(day) ?? [] : [];
      const dateKey = day ? `${prefix}-${String(day).padStart(2, "0")}` : "";
      return <div key={index} className={cn("min-h-16 border-b border-r border-[var(--sb-border-soft)] p-1 sm:min-h-28 sm:p-2", !day && "bg-[var(--sb-surface-muted)]/45")}>
        {day ? <>
          <span className={cn("ml-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] tabular-nums text-muted-foreground", dateKey === todayKey && "bg-[var(--sb-green-800)] font-semibold text-white")}>{day}</span>
          {dayEvents.length ? <>
            <div className="mt-1 flex flex-wrap justify-end gap-1 sm:hidden">{dayEvents.slice(0, 3).map((event) => <Link key={event.id} href={event.href} aria-label={`${event.title}: ${event.context}`} className={cn("h-2.5 w-2.5 rounded-full ring-2 ring-white", eventTone(event.state))} />)}{dayEvents.length > 3 ? <span className="text-[9px] font-semibold text-muted-foreground">+{dayEvents.length - 3}</span> : null}</div>
            <div className="mt-1 hidden space-y-1 sm:block">{dayEvents.slice(0, 2).map((event) => <Link key={event.id} href={event.href} className="block min-h-10 rounded-[2px] bg-[var(--sb-surface-muted)] px-1.5 py-1 text-[10px] leading-3 hover:bg-[var(--sb-green-50)]"><span className="flex items-center gap-1"><i className={cn("h-1.5 w-1.5 shrink-0 rounded-full", eventTone(event.state))} /><strong className="truncate">{event.title}</strong></span><span className="mt-0.5 block truncate text-muted-foreground">{event.context}</span></Link>)}</div>
          </> : null}
        </> : null}
      </div>;
    })}</div>
  </section>;
}
