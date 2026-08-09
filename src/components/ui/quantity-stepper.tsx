"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  label,
  uom,
  step = 1,
  min = 0,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  uom?: string | null;
  step?: number;
  min?: number;
  className?: string;
}) {
  const adjust = (direction: -1 | 1) => {
    const current = Number(value) || 0;
    onChange(String(Math.max(min, Number((current + direction * step).toFixed(4)))));
  };

  return (
    <div className={cn("inline-flex min-h-11 max-w-full items-stretch overflow-hidden rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white", className)}>
      <button type="button" className="grid h-auto min-h-11 w-10 shrink-0 place-items-center border-r border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)]" onClick={() => adjust(-1)} aria-label={`Decrease ${label}`}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <input aria-label={label} type="number" inputMode="decimal" min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 w-16 flex-1 basis-0 border-0 bg-white px-2 text-center font-semibold tabular-nums outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--sb-green-700)]" />
      {uom ? <span className="flex min-w-10 items-center justify-center border-l border-[var(--sb-border)] px-2 text-[11px] font-medium text-[var(--sb-text-muted)]">{uom}</span> : null}
      <button type="button" className="grid h-auto min-h-11 w-10 shrink-0 place-items-center border-l border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)]" onClick={() => adjust(1)} aria-label={`Increase ${label}`}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
