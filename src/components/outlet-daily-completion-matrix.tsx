"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import type { OutletDailyCompletionCell } from "@/server/queries/outlet-daily-records";

type MatrixRow = { branch_id: string; branch_name: string; cells: OutletDailyCompletionCell[] };
type MatrixSummary = { expected: number; completed: number; incomplete: number; missing: number; voided: number };

const stateMeta = {
  missing: { label: "Missing", short: "—", className: "border-[var(--sb-border-strong)] bg-[var(--sb-surface)] text-[var(--sb-text-muted)]" },
  draft: { label: "Draft", short: "D", className: "border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]" },
  morning_recorded: { label: "Morning recorded", short: "M", className: "border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]" },
  evening_completed: { label: "Completed", short: "C", className: "border-[var(--sb-success)] bg-[var(--sb-success-bg)] text-[var(--sb-success)]" },
  reviewed: { label: "Reviewed", short: "R", className: "border-[var(--sb-green-900)] bg-[var(--sb-green-100)] text-[var(--sb-green-900)]" },
  void: { label: "Void", short: "V", className: "border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]" },
} as const;

export function OutletDailyCompletionMatrix({ dates, rows, summary, unavailable = false }: { dates: string[]; rows: MatrixRow[]; summary: MatrixSummary | null; unavailable?: boolean }) {
  const cells = useMemo(() => rows.flatMap((row) => row.cells), [rows]);
  const [activeKey, setActiveKey] = useState(() => {
    const preferred = [...cells].reverse().find((cell) => cell.status !== "missing") ?? cells.at(-1);
    return preferred ? `${preferred.branch_id}:${preferred.record_date}` : "";
  });
  const active = cells.find((cell) => `${cell.branch_id}:${cell.record_date}` === activeKey) ?? cells.at(-1) ?? null;
  const completionPercent = summary?.expected ? (summary.completed / summary.expected) * 100 : 0;

  return <section className="erp-surface isolate min-w-0 max-w-full overflow-hidden" aria-labelledby="outlet-completion-title" data-outlet-completion-matrix>
    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--sb-border-soft)] px-3 py-2.5">
      <div>
        <h2 id="outlet-completion-title" className="text-sm font-semibold">7-day outlet completion</h2>
        <p className="text-xs text-muted-foreground">Expected outlet-days · explicit record status, not a lateness estimate</p>
      </div>
      <p className="text-xs text-muted-foreground"><strong className={unavailable ? "text-[var(--sb-warning)]" : "text-foreground"}>{unavailable ? "Unavailable" : `${formatNumber(completionPercent)}%`}</strong>{unavailable ? "" : " completed or reviewed"}</p>
    </div>
    {unavailable ? <div className="px-4 py-8 text-center" role="status"><p className="text-sm font-medium">Completion insight unavailable</p><p className="mt-1 text-xs text-muted-foreground">The daily record list remains current. Retry this page to load outlet-day coverage.</p></div> : rows.length && summary ? <>
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 pt-2 text-[11px] text-muted-foreground" aria-hidden="true">
        {(["missing", "draft", "evening_completed", "reviewed", "void"] as const).map((status) => <span key={status} className="inline-flex items-center gap-1"><span className={`grid h-4 w-4 place-items-center border text-[9px] font-bold ${stateMeta[status].className}`}>{stateMeta[status].short}</span>{status === "draft" ? "In progress" : stateMeta[status].label}</span>)}
      </div>
      <p id="outlet-completion-scroll-hint" className="px-3 pt-2 text-[11px] text-muted-foreground sm:sr-only">All seven days fit this view. Select a status for exact details.</p>
      <div className="block w-full max-w-full overflow-hidden px-2 py-2 sm:overflow-x-auto sm:overscroll-x-contain sm:px-3" tabIndex={0} aria-label="Outlet completion matrix" aria-describedby="outlet-completion-scroll-hint" data-outlet-completion-scrollport>
        <table className="w-full table-fixed border-separate border-spacing-1 text-xs sm:min-w-[34rem] sm:table-auto">
          <thead><tr><th scope="col" className="w-[5.5rem] max-w-[5.5rem] border-r border-[var(--sb-border-soft)] bg-[var(--sb-surface)] pb-1 pr-1 text-left font-medium text-muted-foreground sm:sticky sm:left-0 sm:z-20 sm:w-40 sm:max-w-40 sm:pr-3">Outlet</th>{dates.map((date) => <th key={date} scope="col" className="pb-1 text-center text-[9px] font-medium text-muted-foreground sm:text-xs"><span className="block">{new Intl.DateTimeFormat("en-MY", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))}</span><span className="text-[9px] font-normal sm:text-[10px]">{date.slice(8)}</span></th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.branch_id}><th scope="row" className="w-[5.5rem] max-w-[5.5rem] truncate border-r border-[var(--sb-border-soft)] bg-[var(--sb-surface)] pr-1 text-left text-[10px] font-medium sm:sticky sm:left-0 sm:z-10 sm:w-40 sm:max-w-40 sm:pr-3 sm:text-xs" title={row.branch_name}>{row.branch_name}</th>{row.cells.map((cell) => {
            const meta = stateMeta[cell.status];
            const key = `${cell.branch_id}:${cell.record_date}`;
            const common = `grid h-9 w-full min-w-0 place-items-center border text-[10px] font-bold transition-shadow hover:ring-2 hover:ring-[var(--sb-green-700)] hover:ring-offset-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] focus-visible:ring-offset-1 sm:min-w-9 sm:text-[11px] ${meta.className} ${activeKey === key ? "ring-2 ring-[var(--sb-green-700)] ring-offset-1" : ""}`;
            const label = `${cell.branch_name}, ${formatDateOnly(cell.record_date)}: ${meta.label}`;
            return <td key={cell.record_date} className="p-0.5 text-center">{cell.record_id
              ? <Link href={`/outlet-daily-records/${cell.record_id}`} className={common} aria-label={`${label}. Open record.`} onMouseEnter={() => setActiveKey(key)} onFocus={() => setActiveKey(key)} onPointerDown={() => setActiveKey(key)}>{meta.short}</Link>
              : <button type="button" className={common} aria-label={label} onMouseEnter={() => setActiveKey(key)} onFocus={() => setActiveKey(key)} onClick={() => setActiveKey(key)}>{meta.short}</button>}</td>;
          })}</tr>)}</tbody>
        </table>
      </div>
      <div className="border-t border-[var(--sb-border-soft)] px-3 py-2" aria-live="polite" data-outlet-completion-preview>
        {active ? <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div><p className="text-xs font-semibold">{active.branch_name} · {formatDateOnly(active.record_date)}</p><p className="text-[11px] text-muted-foreground">{stateMeta[active.status].label}{active.status === "missing" ? " · no record exists for this outlet-day" : " · recorded system status"}</p></div>
          {active.record_id ? <Link href={`/outlet-daily-records/${active.record_id}`} className="inline-flex min-h-11 items-center text-xs font-semibold text-primary underline-offset-4 hover:underline xl:min-h-8">Open daily record</Link> : null}
        </div> : null}
      </div>
      <details className="border-t border-[var(--sb-border-soft)] px-3 py-2 text-xs"><summary className="cursor-pointer font-medium text-primary">Coverage details · {summary.completed} of {summary.expected} complete</summary><p className="mt-2 text-muted-foreground">{summary.incomplete} in progress · {summary.missing} missing · {summary.voided} void. Missing and void outlet-days are not counted as complete.</p></details>
    </> : <div className="px-4 py-8 text-center"><p className="text-sm font-medium">No outlets in your current scope</p><p className="mt-1 text-xs text-muted-foreground">Completion appears after an outlet is assigned and active.</p></div>}
  </section>;
}
