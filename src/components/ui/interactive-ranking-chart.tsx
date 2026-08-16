"use client";

import { useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePreviewSelection } from "@/components/ui/use-preview-selection";

export type InteractiveRankingChartItem = {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  details: string[];
  caution?: string;
  href?: string;
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
  const { activeValue: activeId, optionProps, boundaryProps } = usePreviewSelection<string>();
  const maximum = Math.max(...items.map((item) => item.value), 1);
  const activeItem = items.find((item) => item.id === activeId) ?? null;

  return (
    <div data-interactive-ranking-chart>
      <ol
        role="list"
        aria-label={`${ariaLabel}. Hover, tap, or focus a bar to preview its values.`}
        className="space-y-1.5"
      >
        {items.map((item, index) => {
          const active = item.id === activeId;
          const width = item.value <= 0 ? 0 : Math.max(3, (item.value / maximum) * 100);
          const content = <>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--sb-surface-muted)] text-[10px] font-semibold tabular-nums text-[var(--sb-text-muted)]" aria-hidden="true">{index + 1}</span>
              <span className="col-start-2 row-start-1 min-w-0 truncate text-xs font-medium xl:col-start-2 xl:row-start-1" title={item.label}>{item.label}</span>
              <span className="col-start-2 col-span-2 row-start-2 h-2.5 w-full overflow-hidden rounded-sm bg-[var(--sb-surface-muted)] xl:col-start-3 xl:col-span-1 xl:row-start-1" aria-hidden="true">
                <span
                  className="block h-full rounded-sm bg-[var(--sb-green-700)] transition-[width,opacity] duration-150 group-hover:bg-[var(--sb-green-800)]"
                  style={{ width: `${width}%` }}
                />
              </span>
              <span className="col-start-3 row-start-1 self-center text-right text-xs font-semibold tabular-nums xl:col-start-4 xl:row-span-1">{item.formattedValue}</span>
            </>;
          const rowProps = {
              type: "button" as const,
              "aria-describedby": active ? previewId : undefined,
              "aria-controls": previewId,
              "aria-pressed": active,
              "aria-label": `${index + 1}. ${item.label}, ${item.formattedValue}`,
              "data-ranking-row": true,
              className: cn(
                "group grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-2 gap-y-1 rounded-[var(--sb-radius-control)] px-1.5 py-1.5 text-left outline-none transition-colors xl:grid-cols-[1.25rem_minmax(0,0.9fr)_minmax(7rem,1.6fr)_auto] xl:grid-rows-1 xl:gap-2 xl:min-h-9",
                "hover:bg-[var(--sb-surface-muted)] focus-visible:bg-[var(--sb-green-100)] focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] focus-visible:ring-offset-1",
                active && "bg-[var(--sb-surface-muted)]",
              ),
              ...optionProps(item.id),
            };
          return (
            <li
              key={item.id}
              role="listitem"
              {...boundaryProps}
            >
              <button {...rowProps}>{content}</button>
            </li>
          );
        })}
      </ol>
      <div
        id={previewId}
        role="region"
        aria-label={activeItem ? `Selected ranking preview for ${activeItem.label}` : `${ariaLabel} preview`}
        aria-live="polite"
        data-ranking-preview
        className="mx-1.5 mt-2 grid min-h-[4.5rem] grid-cols-[minmax(0,1fr)_auto] content-center gap-x-3 rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] px-3 py-2"
      >
        {activeItem ? <>
          <div className="col-start-1 row-start-1 flex min-w-0 items-start justify-between gap-3">
            <p className="min-w-0 text-xs font-semibold">{activeItem.label}</p>
            {!activeItem.href ? <p className="shrink-0 text-xs font-semibold tabular-nums text-[var(--sb-green-800)]">{activeItem.formattedValue}</p> : null}
          </div>
          <p className="col-start-1 row-start-2 mt-1 text-[11px] leading-4 text-muted-foreground">{activeItem.details.join(" · ")}</p>
          {activeItem.caution ? <p className="col-span-2 mt-1 text-[11px] font-medium text-warning">{activeItem.caution}</p> : null}
          {activeItem.href ? (
            <Link
              href={activeItem.href}
              data-ranking-open
              className="col-start-2 row-span-2 row-start-1 inline-flex min-h-11 min-w-16 flex-col items-end justify-center rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-[var(--sb-surface-raised)] px-3 text-xs font-semibold text-[var(--sb-green-800)] hover:bg-[var(--sb-green-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] focus-visible:ring-offset-1 xl:min-h-8"
            >
              <span className="tabular-nums">{activeItem.formattedValue}</span>
              <span className="text-[10px] font-medium text-[var(--sb-text-muted)]">Open</span>
              <span className="sr-only"> {activeItem.label}</span>
            </Link>
          ) : null}
        </> : <p className="col-span-2 text-[11px] leading-4 text-muted-foreground" data-ranking-idle>{idlePrompt}</p>}
      </div>
    </div>
  );
}
