"use client";

import { InteractiveRankingChart } from "@/components/ui/interactive-ranking-chart";
import { formatNumber } from "@/lib/utils";

type DemandRankingRow = {
  id: string;
  name: string;
  received: number;
  leftover: number;
  wastage: number;
  movement: number;
  wastage_percent: number;
  completed_records?: number;
  low_sample?: boolean;
  no_completed_records?: boolean;
};

export function DemandRankingChart({
  title,
  description,
  rows,
  metric,
  searchParams,
}: {
  title: string;
  description: string;
  rows: DemandRankingRow[];
  metric: "movement" | "wastage";
  searchParams: Record<string, string | undefined>;
}) {
  // Keep the visual contract local to the component. The query currently
  // returns sorted rows, but this chart can also be reused with filtered or
  // streamed data; rendering order must never depend on an upstream caller.
  const items = [...rows]
    .sort((left, right) => {
      const valueDelta = right[metric] - left[metric];
      if (valueDelta !== 0) return valueDelta;
      const nameDelta = left.name.localeCompare(right.name);
      return nameDelta !== 0 ? nameDelta : left.id.localeCompare(right.id);
    })
    .slice(0, 6)
    .map((row) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) if (value) params.set(key, value);
    params.set("product", row.id);
    return {
    id: row.id,
    label: row.name,
    value: row[metric],
    formattedValue: formatNumber(row[metric]),
    details: [
      `Movement ${formatNumber(row.movement)}`,
      `Received ${formatNumber(row.received)}`,
      `Leftover ${formatNumber(row.leftover)}`,
      `Wastage ${formatNumber(row.wastage)} (${formatNumber(row.wastage_percent)}%)`,
    ],
    caution: row.no_completed_records
      ? "No completed records in this range"
      : row.low_sample
        ? `Low sample · ${row.completed_records ?? 0} completed record(s)`
        : undefined,
    href: `/reports/demand-trends?${params.toString()}`,
  };
  });

  return (
    <section className="overflow-hidden border bg-card" data-demand-ranking-chart={metric}>
      <div className="border-b px-3 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {items.length ? <div className="p-2.5 sm:p-3">
        <InteractiveRankingChart items={items} ariaLabel={title} idlePrompt="Hover, tap, or focus a product to preview its complete values. Open applies that product to the report detail." />
      </div> : <div className="px-3 py-4 text-xs text-muted-foreground" data-demand-ranking-empty>No reliable ranking data is available for the current filters. Incomplete or missing outlet-days are not shown as zero.</div>}
    </section>
  );
}
