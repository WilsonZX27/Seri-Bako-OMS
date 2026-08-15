"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, TouchEvent } from "react";
import Link from "next/link";
import { formatDateOnly, formatNumber } from "@/lib/utils";

export type InventoryDailyMovementPoint = {
  transaction_date: string;
  inbound_entries: number;
  outbound_entries: number;
  movement_entries: number;
};

const width = 680;
const height = 238;
const inset = { top: 18, right: 16, bottom: 30, left: 42 };

export function InventoryDailyMovementChart({ points }: { points: InventoryDailyMovementPoint[] }) {
  const descriptionId = useId();
  const chartRef = useRef<SVGSVGElement>(null);
  // Keep the chart compact until an operator selects a date. This matches the
  // progressive preview behavior used by the other report charts and avoids
  // presenting an arbitrary last-day detail as if it were selected.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const innerWidth = width - inset.left - inset.right;
  const innerHeight = height - inset.top - inset.bottom;
  const maximum = Math.max(1, ...points.flatMap((point) => [point.inbound_entries, point.outbound_entries]));
  const axisMaximum = maximum === 1 ? 1 : Math.ceil(maximum / 2) * 2;
  const groupWidth = innerWidth / Math.max(points.length, 1);
  const barWidth = Math.max(2, Math.min(10, groupWidth * 0.34));
  const activePoint = activeIndex === null ? null : points[activeIndex] ?? null;

  const totals = useMemo(() => points.reduce((sum, point) => ({
    inbound: sum.inbound + point.inbound_entries,
    outbound: sum.outbound + point.outbound_entries,
    all: sum.all + point.movement_entries,
  }), { inbound: 0, outbound: 0, all: 0 }), [points]);

  function indexFromClientX(clientX: number, element: SVGSVGElement) {
    const bounds = element.getBoundingClientRect();
    const viewBoxX = ((clientX - bounds.left) / Math.max(bounds.width, 1)) * width;
    return Math.max(0, Math.min(points.length - 1, Math.floor((viewBoxX - inset.left) / groupWidth)));
  }

  function indexFromPointer(event: PointerEvent<SVGSVGElement>) {
    return indexFromClientX(event.clientX, event.currentTarget);
  }

  function selectPointer(event: PointerEvent<SVGSVGElement>) {
    if (!points.length) return;
    setActiveIndex(indexFromPointer(event));
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (!points.length || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") return setActiveIndex(0);
    if (event.key === "End") return setActiveIndex(points.length - 1);
    setActiveIndex((current) => Math.max(0, Math.min(points.length - 1, (current ?? 0) + (event.key === "ArrowLeft" ? -1 : 1))));
  }

  return (
    <div data-inventory-daily-movement-chart>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-[var(--sb-green-700)]" />Inbound entries</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-[var(--sb-warning)]" />Outbound entries</span>
      </div>
      <svg
        ref={chartRef}
        className="h-auto w-full touch-pan-y rounded-[var(--sb-control-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] focus-visible:ring-offset-2"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        tabIndex={0}
        aria-label="Posted inventory movement entries by date. Inbound bars are first and outbound bars are second for each date."
        aria-describedby={activePoint ? descriptionId : undefined}
        onFocus={() => setActiveIndex((current) => current ?? 0)}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          selectPointer(event);
          if (event.pointerType !== "mouse") event.currentTarget.focus();
        }}
        onTouchStart={(event: TouchEvent<SVGSVGElement>) => {
          const touch = event.touches[0];
          if (touch && points.length) setActiveIndex(indexFromClientX(touch.clientX, event.currentTarget));
        }}
        onClick={(event) => {
          if (points.length) setActiveIndex(indexFromClientX(event.clientX, event.currentTarget));
        }}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse") selectPointer(event);
        }}
      >
        {[0, 0.5, 1].map((ratio) => {
          const lineY = inset.top + innerHeight * ratio;
          const value = axisMaximum * (1 - ratio);
          return <g key={ratio} aria-hidden="true">
            <line x1={inset.left} x2={width - inset.right} y1={lineY} y2={lineY} stroke="var(--sb-border-soft)" />
            {ratio === 0.5 && axisMaximum === 1 ? null : <text x={inset.left - 7} y={lineY + 4} textAnchor="end" fontSize="10" fill="var(--sb-text-muted)">{formatNumber(value)}</text>}
          </g>;
        })}
        {points.map((point, index) => {
          const center = inset.left + groupWidth * index + groupWidth / 2;
          const inboundHeight = (point.inbound_entries / axisMaximum) * innerHeight;
          const outboundHeight = (point.outbound_entries / axisMaximum) * innerHeight;
          const active = index === activeIndex;
          return <g key={point.transaction_date} aria-hidden="true" opacity={active ? 1 : 0.78}>
            {active ? <rect x={inset.left + groupWidth * index} y={inset.top} width={groupWidth} height={innerHeight} fill="var(--sb-surface-muted)" /> : null}
            <rect x={center - barWidth - 1} y={inset.top + innerHeight - inboundHeight} width={barWidth} height={Math.max(inboundHeight, point.inbound_entries ? 2 : 0)} fill="var(--sb-green-700)" />
            <rect x={center + 1} y={inset.top + innerHeight - outboundHeight} width={barWidth} height={Math.max(outboundHeight, point.outbound_entries ? 2 : 0)} fill="var(--sb-warning)" />
          </g>;
        })}
        <rect x={inset.left} y={inset.top} width={innerWidth} height={innerHeight} fill="transparent" data-chart-hit-area />
        {points.length ? <>
          <text x={inset.left} y={height - 8} fontSize="10" fill="var(--sb-text-muted)">{formatDateOnly(points[0].transaction_date)}</text>
          <text x={width - inset.right} y={height - 8} textAnchor="end" fontSize="10" fill="var(--sb-text-muted)">{formatDateOnly(points.at(-1)!.transaction_date)}</text>
        </> : null}
      </svg>

      <div id={descriptionId} role="region" aria-label="Selected inventory movement preview" className={activePoint ? "mt-2 border-t border-[var(--sb-border-soft)] pt-2" : "sr-only"} data-inventory-movement-preview aria-live="polite">
        {activePoint ? <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <p className="text-xs font-semibold">{formatDateOnly(activePoint.transaction_date)}</p>
            <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">Inbound {formatNumber(activePoint.inbound_entries)} · Outbound {formatNumber(activePoint.outbound_entries)} · All posted entries {formatNumber(activePoint.movement_entries)}</p>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold">
            <Link className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline xl:min-h-8" href={`/stock-transactions?from=${activePoint.transaction_date}&to=${activePoint.transaction_date}&direction=inbound`}>Open inbound</Link>
            <Link className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline xl:min-h-8" href={`/stock-transactions?from=${activePoint.transaction_date}&to=${activePoint.transaction_date}&direction=outbound`}>Open outbound</Link>
          </div>
        </div> : <p>Hover, tap, or focus a date to preview its movement entries.</p>}
      </div>

      <details className="mt-2 border-t border-[var(--sb-border-soft)] pt-2 text-xs">
        <summary className="cursor-pointer font-medium text-primary">Daily data · {formatNumber(totals.all)} posted entries</summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <div className="divide-y divide-[var(--sb-border-soft)] sm:hidden" role="list" aria-label="Daily posted inventory movement entries" data-inventory-movement-daily-list>
            {points.map((point) => <div key={point.transaction_date} className="grid gap-2 py-2.5 first:pt-0" role="listitem">
              <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" href={`/stock-transactions?from=${point.transaction_date}&to=${point.transaction_date}`}>{formatDateOnly(point.transaction_date)}</Link>
              <dl className="grid grid-cols-3 gap-2 text-[11px]">
                <div><dt className="text-muted-foreground">Inbound</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(point.inbound_entries)}</dd></div>
                <div><dt className="text-muted-foreground">Outbound</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(point.outbound_entries)}</dd></div>
                <div><dt className="text-muted-foreground">All entries</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(point.movement_entries)}</dd></div>
              </dl>
            </div>)}
          </div>
          <table className="hidden w-full text-left sm:table">
            <thead><tr className="border-b text-muted-foreground"><th className="py-1.5 pr-3 font-medium">Date</th><th className="px-3 py-1.5 text-right font-medium">Inbound</th><th className="px-3 py-1.5 text-right font-medium">Outbound</th><th className="py-1.5 pl-3 text-right font-medium">All entries</th></tr></thead>
            <tbody>{points.map((point) => <tr key={point.transaction_date} className="border-b border-[var(--sb-border-soft)]"><td className="py-1.5 pr-3"><Link className="text-primary underline-offset-4 hover:underline" href={`/stock-transactions?from=${point.transaction_date}&to=${point.transaction_date}`}>{formatDateOnly(point.transaction_date)}</Link></td><td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(point.inbound_entries)}</td><td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(point.outbound_entries)}</td><td className="py-1.5 pl-3 text-right tabular-nums">{formatNumber(point.movement_entries)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
