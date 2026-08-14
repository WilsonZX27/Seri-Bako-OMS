"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
  const [active, setActive] = useState<Signal | null>(null);
  const maximum = Math.max(counts.under_supplied, counts.over_supplied, 1);
  const preview = active ? `${labels[active]} · ${counts[active]} product-outlet ${counts[active] === 1 ? "row" : "rows"}. ${definitions[active]}` : "Hover, tap, or focus a signal to preview its exact count and definition.";

  return <section className="overflow-hidden border bg-card" aria-labelledby="production-signal-title">
    <div className="border-b px-3 py-2">
      <h2 id="production-signal-title" className="text-sm font-semibold">Supply signal distribution</h2>
      <p className="text-xs text-muted-foreground">Reliable product-outlet rows in the selected period. Bar length compares row counts, never quantities across unlike UOMs.</p>
    </div>
    <div className="space-y-4 p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] items-end gap-x-2" aria-label="Under- and over-supply signal count comparison">
        <Link href={filterHref(searchParams, "under_supplied")} className="group flex min-w-0 flex-col items-end gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onMouseEnter={() => setActive("under_supplied")} onMouseLeave={() => setActive(null)} onFocus={() => setActive("under_supplied")} onBlur={() => setActive(null)} onClick={() => setActive("under_supplied")}>
          <span className="flex w-full items-baseline justify-between gap-2 text-xs"><strong>{counts.under_supplied}</strong><span className="truncate text-muted-foreground">Under-supplied</span></span>
          <span className="flex h-8 w-full justify-end rounded-l bg-muted" aria-hidden="true"><span className="h-full rounded-l bg-rose-500 transition-[width,filter] group-hover:brightness-95" style={{ width: `${(counts.under_supplied / maximum) * 100}%` }} /></span>
        </Link>
        <span className="h-12 bg-border" aria-hidden="true" />
        <Link href={filterHref(searchParams, "over_supplied")} className="group flex min-w-0 flex-col gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onMouseEnter={() => setActive("over_supplied")} onMouseLeave={() => setActive(null)} onFocus={() => setActive("over_supplied")} onBlur={() => setActive(null)} onClick={() => setActive("over_supplied")}>
          <span className="flex w-full items-baseline justify-between gap-2 text-xs"><span className="truncate text-muted-foreground">Over-supplied</span><strong>{counts.over_supplied}</strong></span>
          <span className="flex h-8 w-full rounded-r bg-muted" aria-hidden="true"><span className="h-full rounded-r bg-amber-500 transition-[width,filter] group-hover:brightness-95" style={{ width: `${(counts.over_supplied / maximum) * 100}%` }} /></span>
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["balanced", "review_manual"] as const).map((signal) => <Link key={signal} href={filterHref(searchParams, signal)} className={cn("rounded-md border px-3 py-2 text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active === signal && "bg-muted")} onMouseEnter={() => setActive(signal)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(signal)} onBlur={() => setActive(null)} onClick={() => setActive(signal)}><span className="text-muted-foreground">{labels[signal]}</span><strong className="ml-2">{counts[signal]}</strong></Link>)}
      </div>
      <p className="min-h-10 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground" aria-live="polite">{preview}</p>
    </div>
  </section>;
}
