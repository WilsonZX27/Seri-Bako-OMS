"use client";

import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type HistoryItem = { date: string; label: string };

export function EmployeeAttendanceSummary({
  name,
  staffCode,
  employmentType,
  workDate,
  punches,
  missingHistory,
  reportHistory,
  detailHref,
}: {
  name: string;
  staffCode?: string | null;
  employmentType: string;
  workDate: string;
  punches: string;
  missingHistory: HistoryItem[];
  reportHistory: HistoryItem[];
  detailHref: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" className="block text-left font-semibold hover:underline focus-visible:underline" onClick={() => dialog.current?.showModal()}>{name}</button>
    <dialog ref={dialog} onCancel={() => dialog.current?.close()} aria-labelledby="employee-attendance-title" className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-[var(--sb-panel-radius)] border-0 bg-white p-0 shadow-xl backdrop:bg-black/50">
      <div className="space-y-4 p-4">
        <header>
          <h2 id="employee-attendance-title" className="text-lg font-semibold">{name}</h2>
          <p className="text-xs text-muted-foreground">{staffCode ? `${staffCode} · ` : ""}{employmentType === "part_time" ? "Part-time" : "Full-time"}</p>
        </header>
        <section className="rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] p-3 text-sm">
          <p className="font-semibold">{workDate}</p><p className="mt-1 text-muted-foreground">{punches}</p>
        </section>
        <section><h3 className="text-sm font-semibold">Missing punch history</h3>{missingHistory.length ? <ul className="mt-2 space-y-1 text-sm">{missingHistory.map((item) => <li key={`${item.date}:${item.label}`} className="flex justify-between gap-4"><span>{item.date}</span><span className="text-amber-800">{item.label}</span></li>)}</ul> : <p className="mt-1 text-sm text-muted-foreground">No missing punches since 14 Sep 2026.</p>}</section>
        <section><h3 className="text-sm font-semibold">MC and attendance reports</h3>{reportHistory.length ? <ul className="mt-2 space-y-1 text-sm">{reportHistory.map((item) => <li key={`${item.date}:${item.label}`} className="flex justify-between gap-4"><span>{item.date}</span><span>{item.label}</span></li>)}</ul> : <p className="mt-1 text-sm text-muted-foreground">No reports in this week.</p>}</section>
        <footer className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => dialog.current?.close()}>Close</Button><Button asChild><Link href={detailHref}>View full record</Link></Button></footer>
      </div>
    </dialog>
  </>;
}
