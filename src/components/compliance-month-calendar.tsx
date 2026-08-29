import Link from "next/link";
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

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthValue(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, 1);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function monthHref(baseHref: string, date: Date) {
  return `${baseHref}?month=${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function ComplianceMonthCalendar({ baseHref, month, events }: { baseHref: string; month?: string; events: ComplianceCalendarEvent[] }) {
  const cursor = monthValue(month);
  const previous = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const leadingDays = (cursor.getDay() + 6) % 7;
  const monthPrefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
  const eventsByDay = new Map<number, ComplianceCalendarEvent[]>();
  events.filter((event) => event.date.startsWith(monthPrefix)).forEach((event) => {
    const day = Number(event.date.slice(8, 10));
    eventsByDay.set(day, [...(eventsByDay.get(day) ?? []), event]);
  });
  const cells = Array.from({ length: leadingDays + daysInMonth }, (_, index) => index < leadingDays ? null : index - leadingDays + 1);
  while (cells.length % 7) cells.push(null);

  return <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-raised)]" aria-label="Monthly compliance calendar">
    <header className="flex min-h-14 items-center justify-between gap-3 border-b px-3">
      <Button asChild variant="ghost" size="icon"><Link href={monthHref(baseHref, previous)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Link></Button>
      <h2 className="text-sm font-semibold">{cursor.toLocaleDateString("en-MY", { month: "long", year: "numeric" })}</h2>
      <Button asChild variant="ghost" size="icon"><Link href={monthHref(baseHref, next)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Link></Button>
    </header>
    <div className="grid grid-cols-7 border-b bg-[var(--sb-surface-muted)]" role="row">
      {weekdayLabels.map((label) => <div key={label} className="px-1 py-2 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">{label}</div>)}
    </div>
    <div className="grid grid-cols-7">
      {cells.map((day, index) => {
        const dayEvents = day ? eventsByDay.get(day) ?? [] : [];
        return <div key={index} className={cn("min-h-16 border-b border-r p-1 sm:min-h-24 sm:p-2", !day && "bg-[var(--sb-surface-muted)]/60")}>
          {day ? <><span className="block text-right text-[11px] font-medium tabular-nums text-muted-foreground">{day}</span><div className="mt-1 space-y-1">{dayEvents.slice(0, 2).map((event) => <Link key={event.id} href={event.href} className="flex min-h-6 items-center gap-1 rounded-[2px] bg-[var(--sb-surface-muted)] px-1.5 py-1 text-[10px] leading-3 hover:bg-[var(--sb-green-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)]" title={`${event.title} · ${event.context}`}><span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", ["expired", "due_7"].includes(event.state) ? "bg-[var(--sb-danger)]" : "bg-[var(--sb-warning)]")} aria-hidden="true"/><span className="hidden truncate sm:block">{event.title}</span><span className="sr-only sm:hidden">{event.title}</span></Link>)}{dayEvents.length > 2 ? <span className="block text-center text-[10px] text-muted-foreground">+{dayEvents.length - 2}</span> : null}</div></> : null}
        </div>;
      })}
    </div>
  </section>;
}
