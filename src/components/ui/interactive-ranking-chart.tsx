"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type InteractiveRankingChartItem = {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  details: string[];
  caution?: string;
};

export function InteractiveRankingChart({
  items,
  ariaLabel,
  idlePrompt = "Hover, tap, or focus a row to preview its complete values.",
}: {
  items: InteractiveRankingChartItem[];
  ariaLabel: string;
  idlePrompt?: string;
}) {
  const previewId = useId();
  const touchSelectionRef = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const maximum = Math.max(...items.map((item) => item.value), 1);
  const activeItem = items.find((item) => item.id === activeId) ?? null;

  return (
    <div data-interactive-ranking-chart>
      <div
        role="list"
        aria-label={`${ariaLabel}. Hover, tap, or focus a bar to preview its values.`}
        className="space-y-1.5"
      >
        {items.map((item, index) => {
          const active = item.id === activeId;
          const width = Math.max(3, (item.value / maximum) * 100);
          return (
            <button
              key={item.id}
              type="button"
              role="listitem"
              aria-describedby={active ? previewId : undefined}
              aria-label={`${index + 1}. ${item.label}, ${item.formattedValue}`}
              className={cn(
                "group grid w-full grid-cols-[minmax(5.5rem,0.9fr)_minmax(7rem,1.6fr)_auto] items-center gap-2 rounded-[var(--sb-radius-control)] px-1.5 py-1.5 text-left outline-none transition-colors",
                "hover:bg-[var(--sb-surface-muted)] focus-visible:bg-[var(--sb-green-100)] focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] focus-visible:ring-offset-1",
                active && "bg-[var(--sb-surface-muted)]",
              )}
              onMouseEnter={() => {
                touchSelectionRef.current = false;
                setActiveId(item.id);
              }}
              onMouseLeave={() => {
                if (!touchSelectionRef.current) setActiveId(null);
              }}
              onPointerDown={(event) => {
                touchSelectionRef.current = event.pointerType !== "mouse";
                setActiveId(item.id);
              }}
              onClick={() => {
                touchSelectionRef.current = true;
                setActiveId(item.id);
              }}
              onFocus={() => setActiveId(item.id)}
              onBlur={() => {
                if (!touchSelectionRef.current) setActiveId(null);
              }}
            >
              <span className="min-w-0 truncate text-xs font-medium" title={item.label}>{item.label}</span>
              <span className="h-2.5 overflow-hidden rounded-sm bg-[var(--sb-surface-muted)]" aria-hidden="true">
                <span
                  className="block h-full rounded-sm bg-[var(--sb-green-700)] transition-[width,opacity] duration-150 group-hover:bg-[var(--sb-green-800)]"
                  style={{ width: `${width}%` }}
                />
              </span>
              <span className="text-right text-xs font-semibold tabular-nums">{item.formattedValue}</span>
            </button>
          );
        })}
      </div>
      <div
        id={previewId}
        role="tooltip"
        aria-live="polite"
        data-ranking-preview
        className={cn(
          "mt-2 min-h-[3.75rem] rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] px-3 py-2",
          !activeItem && "flex items-center",
        )}
      >
        {activeItem ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-xs font-semibold">{activeItem.label}</p>
              <p className="shrink-0 text-xs font-semibold tabular-nums text-[var(--sb-green-800)]">{activeItem.formattedValue}</p>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{activeItem.details.join(" · ")}</p>
            {activeItem.caution ? <p className="mt-1 text-[11px] font-medium text-warning">{activeItem.caution}</p> : null}
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">{idlePrompt}</p>
        )}
      </div>
    </div>
  );
}
