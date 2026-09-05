"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { todayInKualaLumpur } from "@/lib/business-date";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import type { OutletDailyCompletionCell } from "@/server/queries/outlet-daily-records";

type MatrixRow = { branch_id: string; branch_name: string; cells: OutletDailyCompletionCell[] };
type MatrixSummary = { expected: number; completed: number; incomplete: number; missing: number; voided: number };

const stateMeta = {
  missing: { label: "Missing", short: "—", className: "border-[var(--sb-border-strong)] bg-[var(--sb-surface)] text-[var(--sb-text-muted)]" },
  draft: { label: "Qty Sent pending", short: "QS", className: "border-[var(--sb-info)] bg-[var(--sb-info-bg)] text-[var(--sb-info)]" },
  morning_recorded: { label: "Outlet Entry pending", short: "OE", className: "border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]" },
  evening_completed: { label: "Ready to post", short: "RP", className: "border-[var(--sb-info)] bg-[var(--sb-info-bg)] text-[var(--sb-info)]" },
  reviewed: { label: "Posted", short: "P", className: "border-[var(--sb-success)] bg-[var(--sb-success-bg)] text-[var(--sb-success)]" },
  posted_attention: { label: "Attention", short: "!", className: "border-amber-500 bg-amber-100 text-amber-900" },
  void: { label: "Void", short: "V", className: "border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]" },
} as const;

export function OutletDailyCompletionMatrix({ dates, rows, summary, unavailable = false, canCreate = false, showCoverageDetails = true }: { dates: string[]; rows: MatrixRow[]; summary: MatrixSummary | null; unavailable?: boolean; canCreate?: boolean; showCoverageDetails?: boolean }) {
  const today = todayInKualaLumpur();
  const cells = useMemo(() => rows.flatMap((row) => row.cells), [rows]);
  // Selection remains committed until the operator chooses another day.
  const [activeKey, setActiveKey] = useState("");
  const active = activeKey ? cells.find((cell) => `${cell.branch_id}:${cell.record_date}` === activeKey) ?? null : null;
  const completionPercent = summary?.expected ? (summary.completed / summary.expected) * 100 : null;

  return <section className="erp-surface isolate min-w-0 max-w-full overflow-hidden" aria-labelledby="outlet-completion-title" data-outlet-completion-matrix>
    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--sb-border-soft)] px-3 py-2.5">
      <div>
        <h2 id="outlet-completion-title" className="text-sm font-semibold">7-day outlet completion</h2>
        <p className="text-xs text-muted-foreground">Expected outlet-days · explicit record status, not a lateness estimate</p>
      </div>
      <p className="text-xs text-muted-foreground"><strong className={unavailable ? "text-[var(--sb-warning)]" : "text-foreground"}>{unavailable || completionPercent === null ? "Not available" : `${formatNumber(completionPercent)}%`}</strong>{unavailable || completionPercent === null ? "" : " posted"}</p>
    </div>
    {unavailable ? <div className="px-4 py-8 text-center" role="status"><p className="text-sm font-medium">Completion insight unavailable</p><p className="mt-1 text-xs text-muted-foreground">The daily record list remains current. Retry this page to load outlet-day coverage.</p></div> : rows.length && summary ? <>
      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] divide-x divide-[var(--sb-border-soft)] border-b border-[var(--sb-border-soft)] sm:hidden" data-outlet-completion-phone-summary>
        <div className="px-3 py-2.5"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Complete</p><p className="mt-0.5 text-base font-semibold tabular-nums">{summary.completed}<span className="text-xs font-normal text-muted-foreground">/{summary.expected}</span></p></div>
        <div className="px-3 py-2.5"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Open</p><p className="mt-0.5 text-base font-semibold tabular-nums">{summary.incomplete}</p></div>
        <div className="px-3 py-2.5"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Missing</p><p className="mt-0.5 text-base font-semibold tabular-nums">{summary.missing}</p></div>
      </div>
      <div id="outlet-completion-detail">
      <div className="relative isolate block w-full max-w-full overflow-x-auto overscroll-x-contain bg-[var(--sb-surface)] px-3 py-2" tabIndex={0} aria-label="Outlet completion matrix" data-outlet-completion-scrollport>
        <table className="w-full min-w-[40rem] table-fixed border-separate border-spacing-x-1 border-spacing-y-0 text-xs">
          <colgroup><col className="w-[9rem] sm:w-48" />{dates.map((date) => <col key={date} />)}</colgroup>
          <thead><tr><th scope="col" className="sticky left-0 z-30 min-w-[9rem] w-[9rem] max-w-[9rem] border-r border-[var(--sb-border-soft)] bg-[var(--sb-surface)] pb-1 pr-2 text-left font-medium text-muted-foreground sm:min-w-48 sm:w-48 sm:max-w-48 sm:pr-3">Outlet</th>{dates.map((date) => <th key={date} aria-current={date === today ? "date" : undefined} scope="col" className="min-w-[3.5rem] pb-1 text-center text-[9px] font-medium text-muted-foreground sm:min-w-14 sm:text-xs"><span className="block">{new Intl.DateTimeFormat("en-MY", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))}</span><span className="text-[9px] font-normal sm:text-[10px]">{date.slice(8)}</span></th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.branch_id} className="border-b border-[var(--sb-border-soft)]"><th scope="row" className="sticky left-0 z-20 min-w-[9rem] w-[9rem] max-w-[9rem] border-r border-b border-[var(--sb-border-soft)] bg-[var(--sb-surface)] py-1 pr-2 text-left text-[10px] font-medium sm:min-w-48 sm:w-48 sm:max-w-48 sm:pr-3 sm:text-xs" title={row.branch_name}><span className="block truncate">{row.branch_name}</span></th>{row.cells.map((cell) => {
            const displayStatus = cell.status === "reviewed" && cell.sales_review_status === "needs_review" ? "posted_attention" : cell.status;
            const meta = stateMeta[displayStatus];
            const key = `${cell.branch_id}:${cell.record_date}`;
            const common = `grid h-9 w-full min-w-0 place-items-center border text-[10px] font-bold transition-shadow hover:ring-2 hover:ring-[var(--sb-green-700)] hover:ring-offset-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] focus-visible:ring-offset-1 sm:min-w-9 sm:text-[11px] ${meta.className} ${activeKey === key ? "ring-2 ring-[var(--sb-green-700)] ring-offset-1" : ""}`;
            const label = `${cell.branch_name}, ${formatDateOnly(cell.record_date)}: ${meta.label}`;
            return <td key={cell.record_date} className="p-0.5 text-center"><button type="button" className={common} aria-label={`${label}. Preview details.`} aria-pressed={activeKey === key} onClick={() => setActiveKey(key)}>{meta.short}</button></td>;
          })}</tr>)}</tbody>
        </table>
      </div>
      <div className="border-t border-[var(--sb-border-soft)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-[var(--sb-surface-muted)] px-3 py-2 text-[10px] text-[var(--sb-text-muted)]" aria-label="Status key" data-outlet-completion-legend>
        {(["draft", "morning_recorded", "evening_completed", "reviewed", "posted_attention", "missing", "void"] as const).map((status) => <span key={status} className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap"><span className={`grid h-4 min-w-4 shrink-0 place-items-center border px-0.5 text-[9px] font-bold ${stateMeta[status].className}`}>{stateMeta[status].short}</span><span>{stateMeta[status].label}</span></span>)}
      </div>
      {active ? <div className="min-w-0 border-t border-[var(--sb-border-soft)] px-3 py-2" aria-live="polite" data-outlet-completion-preview>
        <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div><p className="text-xs font-semibold">{active.branch_name} · {formatDateOnly(active.record_date)}</p><p className="text-[11px] text-muted-foreground">{active.status === "reviewed" && active.sales_review_status === "needs_review" ? stateMeta.posted_attention.label : stateMeta[active.status].label}{active.status === "missing" ? " · no record exists for this outlet-day" : ""}</p></div>
          {active.record_id ? <Link href={`/outlet-daily-records/${active.record_id}`} className="inline-flex min-h-11 items-center text-xs font-semibold text-primary underline-offset-4 hover:underline xl:min-h-8">Open daily record</Link> : active.status === "missing" && canCreate ? <Link href={`/outlet-daily-records/new?branch_id=${encodeURIComponent(active.branch_id)}&date=${encodeURIComponent(active.record_date)}`} className="inline-flex min-h-11 items-center text-xs font-semibold text-primary underline-offset-4 hover:underline xl:min-h-8">Create daily record</Link> : null}
        </div>
      </div> : null}
      </div>
      </div>
      {showCoverageDetails ? <details className="border-t border-[var(--sb-border-soft)] px-3 py-2 text-xs"><summary className="cursor-pointer font-medium text-primary">Coverage · {summary.completed}/{summary.expected} complete</summary><dl className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground"><div><dt>Open</dt><dd className="font-semibold text-[var(--sb-text)]">{summary.incomplete}</dd></div><div><dt>Missing</dt><dd className="font-semibold text-[var(--sb-text)]">{summary.missing}</dd></div><div><dt>Void</dt><dd className="font-semibold text-[var(--sb-text)]">{summary.voided}</dd></div></dl></details> : null}
    </> : <div className="px-4 py-8 text-center"><p className="text-sm font-medium">No outlets in your current scope</p><p className="mt-1 text-xs text-muted-foreground">Completion appears after an outlet is assigned and active.</p></div>}
  </section>;
}
