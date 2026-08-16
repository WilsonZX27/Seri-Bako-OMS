"use client";

import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { usePreviewSelection } from "@/components/ui/use-preview-selection";

type Signal = "under_supplied" | "over_supplied" | "balanced" | "review_manual";

type Row = {
  variance_signal: string;
};

const definitions: Record<Signal, string> = {
  under_supplied: "Movement with 5% or less leftover; this is a demand signal, not a confirmed production shortfall.",
  over_supplied: "20% or more leftover, or 10% or more wastage.",
  balanced: "The reliable row did not cross the conservative over- or under-supply thresholds.",
  review_manual: "Coverage confidence or the product-outlet sample is too low for automatic classification.",
};

const labels: Record<Signal, string> = {
  under_supplied: "Under-supplied",
  over_supplied: "Over-supplied",
  balanced: "Balanced",
  review_manual: "Review manually",
};

function filterHref(searchParams: Record<string, string | undefined>, signal: Signal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "signal") params.set(key, value);
  }
  params.set("signal", signal);
  return `/production/variance?${params.toString()}`;
}

export function ProductionVarianceSignalChart({ rows, searchParams }: { rows: Row[]; searchParams: Record<string, string | undefined> }) {
  const counts = {
    under_supplied: rows.filter((row) => row.variance_signal === "under_supplied").length,
    over_supplied: rows.filter((row) => row.variance_signal === "over_supplied").length,
    balanced: rows.filter((row) => row.variance_signal === "balanced").length,
    review_manual: rows.filter((row) => row.variance_signal === "review_manual").length,
  } satisfies Record<Signal, number>;
  const { activeValue: active, optionProps, boundaryProps } = usePreviewSelection<Signal>();
  const previewId = useId();
  const maximum = Math.max(counts.under_supplied, counts.over_supplied, 1);
  const preview = active ? `${labels[active]} · ${counts[active]} product-outlet ${counts[active] === 1 ? "row" : "rows"}. ${definitions[active]}` : "Hover, tap, or focus a signal to preview its exact count and definition.";
  const selectSignal = (signal: Signal) => ({
    type: "button" as const,
    "aria-pressed": active === signal,
    "aria-controls": previewId,
    "aria-describedby": active === signal ? previewId : undefined,
    "data-production-signal-option": signal,
    ...optionProps(signal),
  });

  return <section className="overflow-hidden border bg-card" aria-labelledby="production-signal-title">
    <div className="border-b px-3 py-2">
      <h2 id="production-signal-title" className="text-sm font-semibold">Supply signal distribution</h2>
      <p className="text-xs text-muted-foreground">Reliable product-outlet rows in the selected period. Bar length compares row counts, never quantities across unlike UOMs.</p>
    </div>
    <div className="space-y-4 p-3" {...boundaryProps}>
      <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] items-end gap-x-2" aria-label="Under- and over-supply signal count comparison">
        <button {...selectSignal("under_supplied")} className="group flex min-w-0 flex-col items-end gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex w-full items-baseline justify-between gap-2 text-xs"><strong>{counts.under_supplied}</strong><span className="truncate text-muted-foreground">Under-supplied</span></span>
          <span className="flex h-8 w-full justify-end rounded-l bg-[var(--sb-surface-muted)]" aria-hidden="true"><span className="h-full rounded-l bg-[var(--sb-danger)] transition-[width,filter] group-hover:brightness-95" style={{ width: `${(counts.under_supplied / maximum) * 100}%` }} /></span>
        </button>
        <span className="h-12 bg-border" aria-hidden="true" />
        <button {...selectSignal("over_supplied")} className="group flex min-w-0 flex-col gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex w-full items-baseline justify-between gap-2 text-xs"><span className="truncate text-muted-foreground">Over-supplied</span><strong>{counts.over_supplied}</strong></span>
          <span className="flex h-8 w-full rounded-r bg-[var(--sb-surface-muted)]" aria-hidden="true"><span className="h-full rounded-r bg-[var(--sb-warning)] transition-[width,filter] group-hover:brightness-95" style={{ width: `${(counts.over_supplied / maximum) * 100}%` }} /></span>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["balanced", "review_manual"] as const).map((signal) => <button key={signal} {...selectSignal(signal)} className={cn("min-h-11 rounded-[var(--sb-radius-control)] border px-3 py-2 text-xs transition-colors hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] xl:min-h-9", active === signal && "bg-[var(--sb-surface-muted)]")}><span className="text-muted-foreground">{labels[signal]}</span><strong className="ml-2">{counts[signal]}</strong></button>)}
      </div>
      <div id={previewId} className={cn("min-h-[3.75rem] rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] px-3 py-2 text-xs text-muted-foreground", !active && "flex items-center")} role="region" aria-label="Selected production signal preview" aria-live="polite" data-production-signal-preview><p>{preview}</p>{active ? <Link href={filterHref(searchParams, active)} data-production-signal-open className="mt-2 inline-flex min-h-11 items-center rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-[var(--sb-surface-raised)] px-3 font-semibold text-[var(--sb-green-800)] hover:bg-[var(--sb-green-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] focus-visible:ring-offset-1 xl:min-h-8">Open filtered rows</Link> : null}</div>
    </div>
  </section>;
}
