import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MetricStripItem = {
  label: string;
  value: ReactNode;
};

export function MetricStrip({ items, className }: { items: MetricStripItem[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 overflow-hidden border bg-card sm:grid-cols-3 lg:grid-cols-5", className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0 border-b border-r px-3 py-2.5">
          <p className="truncate text-[11px] text-muted-foreground">{item.label}</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
