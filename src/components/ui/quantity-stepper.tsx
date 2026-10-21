"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type QuantityStepperDensity = "touch" | "compact" | "dense";

const densityStyles: Record<QuantityStepperDensity, { root: string; button: string; input: string }> = {
  touch: { root: "min-h-11", button: "min-h-11 w-10", input: "min-h-11 w-16" },
  compact: { root: "min-h-10", button: "min-h-10 w-9", input: "min-h-10 w-14" },
  dense: { root: "min-h-8", button: "min-h-8 w-7", input: "min-h-8 w-10" },
};

export function QuantityStepper({
  value,
  onChange,
  label,
  uom,
  step = 1,
  buttonStep = step,
  min = 0,
  density = "touch",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  uom?: string | null;
  step?: number;
  buttonStep?: number;
  min?: number;
  density?: QuantityStepperDensity;
  className?: string;
}) {
  const adjust = (direction: -1 | 1) => {
    const current = Number(value) || 0;
    onChange(String(Math.max(min, Number((current + direction * buttonStep).toFixed(4)))));
  };

  const styles = densityStyles[density];

  return (
    <div className={cn("inline-flex max-w-full items-stretch overflow-hidden rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white", styles.root, className)}>
      <button type="button" className={cn("grid shrink-0 place-items-center border-r border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)]", styles.button)} onClick={() => adjust(-1)} aria-label={`Decrease ${label}`}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <input aria-label={label} type="number" inputMode="decimal" min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} className={cn("min-w-0 flex-1 basis-0 border-0 bg-white px-2 text-center font-semibold tabular-nums outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--sb-green-700)]", styles.input)} />
      {uom ? <span className="flex min-w-10 items-center justify-center border-l border-[var(--sb-border)] px-2 text-[11px] font-medium text-[var(--sb-text-muted)]">{uom}</span> : null}
      <button type="button" className={cn("grid shrink-0 place-items-center border-l border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)]", styles.button)} onClick={() => adjust(1)} aria-label={`Increase ${label}`}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
