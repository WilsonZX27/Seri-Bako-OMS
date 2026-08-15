"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { KeyboardEvent } from "react";
import { cn, formatCurrency } from "@/lib/utils";

export type AgingDistributionItem = {
  key: string;
  label: string;
  outstanding: number;
  invoiceCount: number;
  href: string;
};

export function AgingDistributionBars({
  items,
  reportDate,
  title = "Outstanding by aging bucket",
  description,
  ariaLabel = "AP aging distribution",
}: {
  items: AgingDistributionItem[];
  reportDate: string;
  title?: string;
  description?: string;
  ariaLabel?: string;
}) {
  const previewId = useId();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const maximum = Math.max(...items.map((item) => item.outstanding), 1);
  const activeItem = items.find((item) => item.key === activeKey) ?? null;

  return (
    <section className="overflow-hidden border bg-card" data-aging-distribution>
      <div className="border-b px-3 py-2.5 sm:px-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description ?? `Open MYR balances as of ${reportDate}. Select a bucket to filter invoice detail.`}</p>
      </div>
      <div className="space-y-1.5 p-2.5 sm:p-3">
        <ol className="space-y-1.5" role="list" aria-label={ariaLabel}>
        {items.map((item) => {
          const width = item.outstanding <= 0 ? 0 : Math.max(2, (item.outstanding / maximum) * 100);
          return <li key={item.key} role="listitem"><button
            type="button"
            data-aging-bucket
            aria-controls={previewId}
            aria-pressed={activeKey === item.key}
            aria-describedby={activeKey === item.key ? previewId : undefined}
            aria-label={`${item.label}: ${formatCurrency(item.outstanding)}, ${item.invoiceCount} invoices. Preview bucket.`}
            className="group grid min-h-11 w-full grid-cols-[minmax(7rem,1fr)_minmax(5rem,1.4fr)_auto] items-center gap-2 rounded-[var(--sb-radius-control)] px-1.5 py-1.5 text-left outline-none hover:bg-[var(--sb-surface-muted)] focus-visible:bg-[var(--sb-green-100)] focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] focus-visible:ring-offset-1"
            onMouseEnter={() => setActiveKey(item.key)}
            onFocus={() => setActiveKey(item.key)}
            onClick={() => setActiveKey(item.key)}
            onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
              if (event.key === "Escape") {
                setActiveKey(null);
                event.currentTarget.blur();
              }
            }}
          >
            <span className="min-w-0 text-xs font-medium leading-4">{item.label}</span>
            <span className="h-2.5 overflow-hidden rounded-sm bg-[var(--sb-surface-muted)] ring-1 ring-inset ring-[var(--sb-border-soft)]" aria-hidden="true">
              <span className="block h-full rounded-sm bg-[var(--sb-green-700)] transition-[width] duration-150 group-hover:bg-[var(--sb-green-800)]" style={{ width: `${width}%` }} />
            </span>
            <span className="text-right">
              <strong className="block whitespace-nowrap text-xs tabular-nums">{formatCurrency(item.outstanding)}</strong>
              <span className="block text-[11px] text-muted-foreground">{item.invoiceCount} invoice{item.invoiceCount === 1 ? "" : "s"}</span>
            </span>
          </button></li>;
        })}
        </ol>
        <div id={previewId} role="region" aria-label="Selected aging bucket preview" aria-live="polite" data-aging-preview className={cn("rounded-[var(--sb-radius-control)] px-3 py-2 text-[11px] text-muted-foreground", activeItem ? "border border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)]" : "sr-only")}>
          {activeItem ? <><strong className="text-[var(--sb-text)]">{activeItem.label}</strong> · {formatCurrency(activeItem.outstanding)} across {activeItem.invoiceCount} invoice{activeItem.invoiceCount === 1 ? "" : "s"}.<br /><Link href={activeItem.href} data-aging-open className="mt-2 inline-flex min-h-11 items-center rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-[var(--sb-surface-raised)] px-3 font-semibold text-[var(--sb-green-800)] hover:bg-[var(--sb-green-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] focus-visible:ring-offset-1 xl:min-h-8">Open filtered invoices</Link></> : "Hover, tap, or focus a bucket to preview it. Use Open to filter the invoice table."}
        </div>
      </div>
    </section>
  );
}
