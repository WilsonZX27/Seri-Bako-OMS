"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

export type InteractiveLineChartPoint = {
  id: string;
  label: string;
  value: number;
  previewValue: string;
  previewDetails: string[];
};

type ChartInset = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type InteractiveLineChartProps = {
  points: InteractiveLineChartPoint[];
  width: number;
  height: number;
  inset: ChartInset;
  maximum: number;
  ariaLabel: string;
  valueSuffix?: string;
  maximumFractionDigits?: number;
};

export function InteractiveLineChart({
  points,
  width,
  height,
  inset,
  maximum,
  ariaLabel,
  valueSuffix = "",
  maximumFractionDigits = 1,
}: InteractiveLineChartProps) {
  const previewId = useId();
  const chartRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const innerWidth = width - inset.left - inset.right;
  const innerHeight = height - inset.top - inset.bottom;
  const safeMaximum = Math.max(1, maximum);
  const x = (index: number) => inset.left + (points.length <= 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  const y = (value: number) => inset.top + innerHeight - (value / safeMaximum) * innerHeight;
  const path = points.map((point, index) => `${index ? "L" : "M"} ${x(index).toFixed(1)} ${y(point.value).toFixed(1)}`).join(" ");
  const activePoint = activeIndex === null ? null : points[activeIndex];
  const activeX = activeIndex === null ? null : x(activeIndex);
  const activeY = activePoint ? y(activePoint.value) : null;
  const activeRatio = activeIndex === null || points.length <= 1 ? 0.5 : activeIndex / (points.length - 1);
  const translateX = activeRatio < 0.2 ? "0%" : activeRatio > 0.8 ? "-100%" : "-50%";
  const placePreviewBelow = activeY !== null && activeY < inset.top + 58;
  const formatAxisValue = (value: number) => `${new Intl.NumberFormat("en-MY", { maximumFractionDigits }).format(value)}${valueSuffix}`;

  useEffect(() => {
    chartRef.current?.setAttribute("data-chart-ready", "true");
  }, []);

  function getIndexFromPointer(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return 0;
    const viewBoxX = ((event.clientX - rect.left) / rect.width) * width;
    const ratio = Math.max(0, Math.min(1, (viewBoxX - inset.left) / innerWidth));
    return points.length <= 1 ? 0 : Math.round(ratio * (points.length - 1));
  }

  function selectFromPointer(event: PointerEvent<SVGSVGElement>) {
    setActiveIndex(getIndexFromPointer(event));
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    selectFromPointer(event);
    if (event.pointerType !== "mouse") {
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (event.pointerType === "mouse" || event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      selectFromPointer(event);
    }
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === "Escape") {
      setActiveIndex(null);
      event.currentTarget.blur();
      return;
    }

    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") return setActiveIndex(0);
    if (event.key === "End") return setActiveIndex(points.length - 1);
    const current = activeIndex ?? 0;
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    setActiveIndex(Math.max(0, Math.min(points.length - 1, current + direction)));
  }

  return (
    <div className="relative h-full min-w-0 w-full" data-interactive-line-chart>
      <svg
        ref={chartRef}
        className="block h-full min-h-72 w-full touch-pan-y rounded-[var(--sb-radius-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] focus-visible:ring-offset-2"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        tabIndex={0}
        aria-roledescription="interactive line chart"
        data-chart-active-index={activeIndex ?? undefined}
        aria-label={`${ariaLabel}. Hover, tap, or use the left and right arrow keys to preview each recorded point.`}
        aria-describedby={activePoint ? previewId : undefined}
        onFocus={() => setActiveIndex((current) => current ?? 0)}
        onBlur={() => setActiveIndex(null)}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse" && !event.currentTarget.matches(":focus")) setActiveIndex(null);
        }}
      >
        {[0, 0.5, 1].map((ratio) => {
          const value = safeMaximum * (1 - ratio);
          const lineY = inset.top + innerHeight * ratio;
          return (
            <g key={ratio}>
              <line x1={inset.left} x2={width - inset.right} y1={lineY} y2={lineY} stroke="var(--sb-border-soft)" vectorEffect="non-scaling-stroke" />
              <text x={inset.left - 7} y={lineY + 4} textAnchor="end" fontSize="10" fill="var(--sb-text-muted)">{formatAxisValue(value)}</text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="var(--sb-green-700)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" pointerEvents="none" />
        {points.length <= 14 ? points.map((point, index) => (
          <circle
            key={point.id}
            cx={x(index)}
            cy={y(point.value)}
            r="3.25"
            fill="var(--sb-surface-raised)"
            stroke="var(--sb-green-700)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )) : null}
        {points.length === 1 ? (
          <text x={inset.left + innerWidth / 2} y={height - 7} textAnchor="middle" fontSize="10" fill="var(--sb-text-muted)">{points[0].label}</text>
        ) : (
          <>
            <text x={inset.left} y={height - 7} fontSize="10" fill="var(--sb-text-muted)">{points[0]?.label}</text>
            <text x={width - inset.right} y={height - 7} textAnchor="end" fontSize="10" fill="var(--sb-text-muted)">{points[points.length - 1]?.label}</text>
          </>
        )}
        <rect
          x={inset.left}
          y={inset.top}
          width={innerWidth}
          height={innerHeight}
          fill="transparent"
          pointerEvents="all"
          data-chart-hit-area
        />
        {activePoint && activeX !== null && activeY !== null ? (
          <g pointerEvents="none" aria-hidden="true">
            <line
              x1={activeX}
              x2={activeX}
              y1={inset.top}
              y2={inset.top + innerHeight}
              stroke="var(--sb-green-700)"
              strokeWidth="1"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
              opacity="0.55"
            />
              <circle cx={activeX} cy={activeY} r="7" fill="var(--sb-green-100)" opacity="0.9" />
              <circle cx={activeX} cy={activeY} r="3.75" fill="var(--sb-surface-raised)" stroke="var(--sb-green-800)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </g>
        ) : null}
      </svg>
      <ol className="sr-only" data-chart-data-list aria-label={`${ariaLabel} data points`}>
        {points.map((point) => (
          <li key={point.id}>
            <span>{point.label}</span>: <span>{point.previewValue}</span>. {point.previewDetails.join(". ")}
          </li>
        ))}
      </ol>
      {activePoint && activeX !== null && activeY !== null ? (
        <div
          id={previewId}
          role="tooltip"
          aria-live="polite"
          data-chart-preview
          className="pointer-events-none absolute w-48 max-w-[calc(100%-0.75rem)] rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-[var(--sb-surface-raised)] px-3 py-2 text-left shadow-sm"
          style={{
            left: `${(activeX / width) * 100}%`,
            top: `${(activeY / height) * 100}%`,
            transform: `translate(${translateX}, ${placePreviewBelow ? "12px" : "calc(-100% - 12px)"})`,
          }}
        >
          <p className="text-[11px] font-medium text-[var(--sb-text-muted)]">{activePoint.label}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--sb-text)]">{activePoint.previewValue}</p>
          <p className="mt-1 text-[11px] tabular-nums text-[var(--sb-text-muted)]">{activePoint.previewDetails.join(" · ")}</p>
        </div>
      ) : null}
    </div>
  );
}
