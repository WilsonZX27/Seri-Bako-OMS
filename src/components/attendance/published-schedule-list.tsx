"use client";

import { useState } from "react";
import { ShiftRequestButton } from "./shift-request-button";
import type { getOwnPublishedShifts } from "@/server/queries/attendance";

export function PublishedScheduleList({ shifts }: { shifts: Awaited<ReturnType<typeof getOwnPublishedShifts>> }) {
  const [outlet, setOutlet] = useState("all");
  const outlets = [...new Set(shifts.map(shift => shift.branches?.branch_name ?? "Assigned outlet"))];
  const visibleOutlets = outlet === "all" ? outlets : outlets.filter(name => name === outlet);
  return <section className="sb-work-surface overflow-hidden">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
      <h2 className="text-sm font-semibold">My published schedule</h2>
      <label className="flex items-center gap-2 text-xs">Outlet<select aria-label="Published schedule outlet" value={outlet} onChange={event => setOutlet(event.target.value)} className="h-10 max-w-52 rounded border bg-white px-2"><option value="all">All outlets</option>{outlets.map(name => <option key={name}>{name}</option>)}</select></label>
    </header>
    {visibleOutlets.map(name => <section key={name} aria-label={name}>
      <h3 className="border-b bg-[var(--sb-surface-muted)] px-3 py-2 text-xs font-semibold">{name}</h3>
      <ul className="divide-y">{shifts.filter(shift => (shift.branches?.branch_name ?? "Assigned outlet") === name).map(shift => {
        const start = shift.shift_templates?.planned_start ?? shift.custom_start;
        const end = shift.shift_templates?.planned_end ?? shift.custom_end;
        return <li key={shift.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
          <div><strong className="block tabular-nums">{shift.work_date}</strong><span className="text-muted-foreground">{start && end ? `${start.slice(0, 5)}–${end.slice(0, 5)}` : shift.assignment_kind.toUpperCase()}</span></div>
          <ShiftRequestButton assignmentId={shift.id} />
        </li>;
      })}</ul>
    </section>)}
    {!shifts.length ? <p className="p-3 text-sm text-muted-foreground">No published shifts this week.</p> : null}
  </section>;
}
