"use client";

import { InteractiveLineChart } from "@/components/ui/interactive-line-chart";
import { formatNumber } from "@/lib/utils";

type DemandTrendChartRow = {
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

export function DemandTrendChart({ rows }: { rows: DemandTrendChartRow[] }) {
  const maximum = Math.max(...rows.map((row) => row.movement), 1);
  const points = rows.map((row) => ({
    id: row.id,
    label: row.name,
    value: row.movement,
    previewValue: `${formatNumber(row.movement)} estimated movement`,
    previewDetails: [
      `Received ${formatNumber(row.received)}`,
      `Leftover ${formatNumber(row.leftover)}`,
      `Wastage ${formatNumber(row.wastage)} (${formatNumber(row.wastage_percent)}%)`,
      row.no_completed_records
        ? "No completed records"
        : row.low_sample
          ? `Low sample · ${row.completed_records ?? 0} completed`
          : `${row.completed_records ?? 0} completed record(s)`,
    ],
  }));

  return (
    <section className="overflow-hidden border bg-card" data-demand-trend-chart>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b px-3 py-2.5 sm:px-4">
        <div>
          <h2 className="text-sm font-semibold">Daily movement trend</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Estimated movement from completed outlet records—not POS sales.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground" aria-hidden="true">
          <span className="h-0.5 w-5 bg-[var(--sb-green-700)]" />
          Estimated movement
        </div>
      </div>
      {rows.length ? <div className="px-2 pb-2 pt-3 sm:px-4 sm:pb-3">
        <InteractiveLineChart
          points={points}
          width={760}
          height={260}
          inset={{ top: 18, right: 18, bottom: 28, left: 58 }}
          maximum={maximum}
          ariaLabel="Daily estimated movement trend"
        />
        <p className="mt-1 px-1 text-[11px] leading-4 text-muted-foreground">Hover or drag across the chart to preview a date. Use arrow keys when the chart is focused.</p>
      </div> : <div className="px-3 py-4 text-xs text-muted-foreground" data-demand-trend-empty>No reliable daily trend data is available for the current filters. Incomplete or missing outlet-days are not shown as zero.</div>}
    </section>
  );
}
