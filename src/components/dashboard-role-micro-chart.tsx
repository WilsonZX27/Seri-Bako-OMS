"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type DashboardRoleMicroChartItem = {
  key: string;
  label: string;
  value: number | null;
  href: string;
  definition: string;
  tone?: "critical" | "warning" | "active" | "neutral";
};

const toneClasses = {
  critical: "bg-[var(--sb-danger)]",
  warning: "bg-[var(--sb-warning)]",
  active: "bg-[var(--sb-green-700)]",
  neutral: "bg-[var(--sb-neutral-text)]",
};

export function DashboardRoleMicroChart({ title, items }: { title: string; items: DashboardRoleMicroChartItem[] }) {
  const firstKnown = useMemo(() => items.find((item) => item.value !== null && item.value > 0) ?? items.find((item) => item.value !== null) ?? items[0], [items]);
  const [activeKey, setActiveKey] = useState(firstKnown?.key ?? "");
  const active = items.find((item) => item.key === activeKey) ?? firstKnown;
  const maximum = Math.max(...items.flatMap((item) => item.value === null ? [] : [item.value]), 1);

  return <section className="sb-work-surface overflow-hidden" aria-labelledby="dashboard-role-chart-title" data-dashboard-role-micro-chart>
    <div className="border-b border-[var(--sb-border-soft)] px-4 py-3">
      <h2 id="dashboard-role-chart-title" className="text-sm font-semibold text-[var(--sb-text)]">{title}</h2>
      <p className="mt-0.5 text-[11px] text-[var(--sb-text-muted)]">Current request-time snapshot · record and item counts only</p>
    </div>
    <div className="space-y-2 p-3">
      <div className="grid grid-cols-2 gap-1.5" role="list" aria-label={`${title} comparison`}>{items.map((item) => {
        const selected = active?.key === item.key;
        return <div key={item.key} role="listitem"><button type="button" className={`group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-[var(--sb-radius-control)] px-2 py-1.5 text-left transition-colors hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] ${selected ? "bg-[var(--sb-surface-muted)]" : ""}`} aria-pressed={selected} onMouseEnter={() => setActiveKey(item.key)} onFocus={() => setActiveKey(item.key)} onClick={() => setActiveKey(item.key)}>
          <span className="min-w-0">
            <span className="block truncate text-xs text-[var(--sb-text)]">{item.label}</span>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[var(--sb-neutral-bg)]" aria-hidden="true"><span className={`block h-full rounded-full transition-[width] ${toneClasses[item.tone ?? "neutral"]}`} style={{ width: item.value === null ? "0%" : `${(item.value / maximum) * 100}%` }} /></span>
          </span>
          <strong className={item.value === null ? "text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--sb-warning)]" : "text-sm tabular-nums text-[var(--sb-text)]"}>{item.value === null ? "Unavailable" : item.value}</strong>
        </button></div>;
      })}</div>
      {active ? <div className="flex min-h-14 items-start justify-between gap-3 rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] px-3 py-2" data-dashboard-role-chart-preview aria-live="polite">
        <p className="text-[11px] leading-4 text-[var(--sb-text-muted)]"><strong className="text-[var(--sb-text)]">{active.label}: {active.value === null ? "Unavailable" : active.value}</strong><br />{active.definition}</p>
        <Link prefetch={false} href={active.href} className="shrink-0 rounded-[var(--sb-radius-control)] px-2 py-1 text-[11px] font-semibold text-[var(--sb-green-800)] hover:bg-[var(--sb-green-050)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)]">Open</Link>
      </div> : null}
    </div>
  </section>;
}
