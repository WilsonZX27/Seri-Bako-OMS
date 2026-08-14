import { InteractiveLineChart } from "@/components/ui/interactive-line-chart";
import { formatDateOnly, formatNumber } from "@/lib/utils";

type WastagePoint = {
  id: string;
  name: string;
  received: number;
  wastage: number;
  wastage_percent: number;
};

export function OutletDailyWastageChart({ points }: { points: WastagePoint[] }) {
  const width = 640;
  const height = 184;
  const inset = { top: 18, right: 18, bottom: 30, left: 54 };
  const maximum = Math.max(10, ...points.map((point) => point.wastage_percent));
  const average = points.length ? points.reduce((sum, point) => sum + point.wastage_percent, 0) / points.length : 0;

  const formatPercent = (value: number) => new Intl.NumberFormat("en-MY", { maximumFractionDigits: 1 }).format(value);
  const chartPoints = points.map((point) => ({
    id: point.id,
    label: formatDateOnly(point.name),
    value: point.wastage_percent,
    previewValue: `${formatPercent(point.wastage_percent)}% wastage rate`,
    previewDetails: [`${formatNumber(point.wastage)} wastage`, `${formatNumber(point.received)} received`],
  }));

  return (
    <section className="erp-surface overflow-hidden" aria-labelledby="outlet-wastage-trend-title">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--sb-border-soft)] px-3 py-2.5">
        <div>
          <h2 id="outlet-wastage-trend-title" className="text-sm font-semibold">30-day wastage rate</h2>
          <p className="text-xs text-muted-foreground">Completed outlet records only · wastage ÷ received</p>
        </div>
        <p className="text-xs text-muted-foreground">Daily average <strong className="text-foreground">{formatPercent(average)}%</strong></p>
      </div>
      {points.length ? (
        <div className="px-2 pb-2 pt-3">
          <InteractiveLineChart
            points={chartPoints}
            width={width}
            height={height}
            inset={inset}
            maximum={maximum}
            valueSuffix="%"
            maximumFractionDigits={1}
            ariaLabel={`Daily wastage percentage over ${points.length} recorded days`}
          />
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            <span className="hidden sm:inline">Hover or focus the chart, then use arrow keys for exact values.</span>
            <span className="sm:hidden">Tap or drag across the chart for exact values.</span>
          </p>
          <table className="sr-only">
            <caption>Daily wastage rate data</caption>
            <thead><tr><th>Date</th><th>Received</th><th>Wastage</th><th>Wastage rate</th></tr></thead>
            <tbody>{points.map((point) => <tr key={point.id}><td>{formatDateOnly(point.name)}</td><td>{formatNumber(point.received)}</td><td>{formatNumber(point.wastage)}</td><td>{formatPercent(point.wastage_percent)}%</td></tr>)}</tbody>
          </table>
        </div>
      ) : <div className="px-4 py-8 text-center"><p className="text-sm font-medium">No completed records in the last 30 days</p><p className="mt-1 text-xs text-muted-foreground">The trend will appear after evening records are completed.</p></div>}
    </section>
  );
}
