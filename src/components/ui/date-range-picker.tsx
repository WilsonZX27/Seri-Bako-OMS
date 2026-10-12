"use client";

import { useId, useRef, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { shiftBusinessDate } from "@/lib/business-date";

const dateLabel = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const monthOf = (value: string) => `${value.slice(0, 7)}-01`;
function shiftMonth(value: string, delta: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 10);
}
function validRange(start: string, end: string, maxDays: number) {
  const days = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000 + 1;
  return Number.isFinite(days) && days >= 1 && days <= maxDays;
}

/** Draft selection is committed only by Apply; the enclosing GET form owns report navigation. */
export function DateRangePicker({ start, end, today, maxDays = 31 }: { start: string; end: string; today: string; maxDays?: number }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [committed, setCommitted] = useState({ start, end });
  const [draft, setDraft] = useState({ start, end });
  const [month, setMonth] = useState(monthOf(start));
  const [anchor, setAnchor] = useState<string | null>(null);
  const presets = [
    { label: "Today", start: today, end: today },
    { label: "Yesterday", start: shiftBusinessDate(today, -1), end: shiftBusinessDate(today, -1) },
    { label: "Last 7 Days", start: shiftBusinessDate(today, -6), end: today },
    { label: "Last 30 Days", start: shiftBusinessDate(today, -29), end: today },
    { label: "Month to date", start: monthOf(today), end: today },
  ];
  const active = presets.find(p => p.start === draft.start && p.end === draft.end)?.label ?? "Custom Range";
  const valid = validRange(draft.start, draft.end, maxDays);
  function selectDay(day: string) {
    if (!anchor) { setAnchor(day); setDraft({ start: day, end: day }); }
    else { setDraft({ start: day < anchor ? day : anchor, end: day < anchor ? anchor : day }); setAnchor(null); }
  }
  function calendar(value: string, second = false) {
    const date = new Date(`${value}T00:00:00Z`);
    const days = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    return <section className={second ? "hidden min-w-0 md:block" : "min-w-0"} aria-label={new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(date)}>
      <h3 className="mb-3 text-center text-sm font-semibold">{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(date)}</h3>
      <div className="grid grid-cols-7 text-center text-xs">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <span key={d} className="py-2 text-muted-foreground">{d}</span>)}
      {Array.from({ length: date.getUTCDay() }, (_, i) => <span key={`blank-${i}`} />)}
      {Array.from({ length: days }, (_, i) => {
        const day = shiftBusinessDate(value, i);
        const endpoint = day === draft.start || day === draft.end;
        const between = day > draft.start && day < draft.end;
        return <button key={day} type="button" aria-label={dateLabel(day)} aria-pressed={endpoint || between} onClick={() => selectDay(day)} className={`min-h-11 touch-manipulation text-xs tabular-nums focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] ${endpoint ? "rounded-[var(--sb-radius-control)] bg-[var(--sb-green-900)] font-semibold text-white" : between ? "rounded-none bg-[var(--sb-surface-muted)] text-[var(--sb-green-900)]" : "rounded-none hover:bg-[var(--sb-surface-muted)]"}`}>{i + 1}</button>;
      })}</div>
    </section>;
  }
  return <>
    <input type="hidden" name="history_start" value={committed.start} />
    <input type="hidden" name="history_date" value={committed.end} />
    <input type="hidden" name="period" value="7" />
    <Button ref={trigger} type="button" variant="secondary" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setDraft(committed); setMonth(monthOf(committed.start)); setAnchor(null); setOpen(true); }} className="max-lg:min-h-11"><CalendarDays className="size-4 shrink-0" aria-hidden="true" /><span className="truncate">{dateLabel(committed.start)}{committed.start !== committed.end ? ` – ${dateLabel(committed.end)}` : ""}</span></Button>
    <ModalShell open={open} onClose={() => setOpen(false)} titleId={id} triggerRef={trigger} className="max-w-[760px]">
      <header className="mb-3 flex items-center justify-between gap-3"><h2 id={id} className="text-sm font-semibold">Date range</h2><Button type="button" variant="ghost" size="icon" aria-label="Cancel date selection" onClick={() => setOpen(false)} className="min-h-11 min-w-11"><X aria-hidden="true" /></Button></header>
      <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
        <div className="flex flex-wrap gap-1 md:flex-col" aria-label="Quick ranges">{[...presets, { label: "Custom Range", ...draft }].map(p => <Button key={p.label} type="button" variant="ghost" aria-pressed={active === p.label} className={`min-h-11 justify-start ${active === p.label ? "bg-[var(--sb-surface-muted)] text-[var(--sb-green-900)]" : ""}`} onClick={() => { if (p.label !== "Custom Range") { setDraft({ start: p.start, end: p.end }); setMonth(monthOf(p.start)); } setAnchor(null); }}>{p.label}{active === p.label ? <Check aria-hidden="true" className="ml-auto" /> : null}</Button>)}</div>
        <div className="min-w-0"><div className="mb-2 flex justify-between"><Button type="button" variant="ghost" size="icon" aria-label="Previous month" className="min-h-11 min-w-11" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft aria-hidden="true" /></Button><Button type="button" variant="ghost" size="icon" aria-label="Next month" className="min-h-11 min-w-11" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight aria-hidden="true" /></Button></div>
          <div className="grid gap-4 md:grid-cols-2">{calendar(month)}{calendar(shiftMonth(month, 1), true)}</div>
          <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">{anchor ? "Choose an end date." : `Select a start and end date · up to ${maxDays} days.`}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--sb-border-soft)] pt-3"><label className="min-w-0 text-xs">From<Input type="date" value={draft.start} onChange={e => { setDraft({ ...draft, start: e.target.value }); setAnchor(null); }} className="mt-1 min-h-11" /></label><label className="min-w-0 text-xs">To<Input type="date" value={draft.end} onChange={e => { setDraft({ ...draft, end: e.target.value }); setAnchor(null); }} className="mt-1 min-h-11" /></label></div>
      {!valid ? <p role="alert" className="mt-2 text-xs text-[var(--sb-danger)]">Choose a valid range of 1–{maxDays} days.</p> : null}
      <footer className="mt-4 flex justify-end gap-2"><Button type="button" variant="secondary" className="min-h-11" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" className="min-h-11" disabled={!valid || !!anchor} onClick={() => { setCommitted(draft); setOpen(false); }}>Apply range</Button></footer>
    </ModalShell>
  </>;
}
