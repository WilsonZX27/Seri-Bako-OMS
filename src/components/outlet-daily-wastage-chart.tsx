import Link from "next/link";
import { InteractiveLineChart } from "@/components/ui/interactive-line-chart";
import { formatDateOnly, formatNumber } from "@/lib/utils";

type WastagePoint = {
  id: string;
  name: string;
  received: number;
  wastage: number;
  wastage_percent: number;
};

export function OutletDailyWastageChart({ points, branch, unavailable = false }: { points: WastagePoint[]; branch?: string; unavailable?: boolean }) {
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
  const recordHref = (date: string) => {
    const query = new URLSearchParams({ date });
    if (branch && branch !== "all") query.set("branch", branch);
    return `/outlet-daily-records?${query.toString()}`;
  };

  return (
    <section className="erp-surface overflow-hidden" aria-labelledby="outlet-wastage-trend-title">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--sb-border-soft)] px-3 py-2.5">
        <div>
          <h2 id="outlet-wastage-trend-title" className="text-sm font-semibold">30-day wastage rate</h2>
          <p className="text-xs text-muted-foreground">Completed outlet records only · wastage ÷ received</p>
        </div>
        <p className="text-xs text-muted-foreground">Daily average <strong className={unavailable ? "text-[var(--sb-warning)]" : "text-foreground"}>{unavailable ? "Unavailable" : `${formatPercent(average)}%`}</strong></p>
      </div>
      {unavailable ? <div className="px-4 py-8 text-center" role="status"><p className="text-sm font-medium">Wastage trend unavailable</p><p className="mt-1 text-xs text-muted-foreground">The daily record list remains current. Retry this page to load the 30-day insight.</p></div> : points.length ? (
        <div className="grid gap-3 p-2 pt-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(16rem,0.85fr)] lg:p-3">
          <div className="min-w-0">
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
          </div>
          <div className="min-w-0 border-t border-[var(--sb-border-soft)] pt-2 text-xs lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
            <p className="font-medium text-primary">Daily data · {points.length} recorded day{points.length === 1 ? "" : "s"}</p>
            <div className="mt-2 max-h-64 overflow-y-auto">
              <div className="divide-y divide-[var(--sb-border-soft)] sm:hidden" role="list" aria-label="Daily wastage rate data" data-outlet-wastage-daily-list>
                {points.map((point) => <div key={point.id} className="grid grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-2 py-2 first:pt-0" role="listitem">
                  <Link className="inline-flex min-h-9 items-center font-semibold text-primary underline-offset-4 hover:underline" href={recordHref(point.name)}>{formatDateOnly(point.name)}</Link>
                  <dl className="grid grid-cols-3 gap-1.5 text-[11px]">
                    <div><dt className="text-muted-foreground">Received</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(point.received)}</dd></div>
                    <div><dt className="text-muted-foreground">Wastage</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(point.wastage)}</dd></div>
                    <div><dt className="text-muted-foreground">Rate</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatPercent(point.wastage_percent)}%</dd></div>
                  </dl>
                </div>)}
              </div>
              <table className="hidden w-full text-left sm:table">
                <caption className="sr-only">Daily wastage rate data</caption>
                <thead><tr className="border-b text-muted-foreground"><th className="py-1.5 pr-3 font-medium">Date</th><th className="px-3 py-1.5 text-right font-medium">Received</th><th className="px-3 py-1.5 text-right font-medium">Wastage</th><th className="py-1.5 pl-3 text-right font-medium">Rate</th></tr></thead>
                <tbody>{points.map((point) => <tr key={point.id} className="border-b border-[var(--sb-border-soft)]"><td className="py-1.5 pr-3"><Link className="text-primary underline-offset-4 hover:underline" href={recordHref(point.name)}>{formatDateOnly(point.name)}</Link></td><td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(point.received)}</td><td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(point.wastage)}</td><td className="py-1.5 pl-3 text-right tabular-nums">{formatPercent(point.wastage_percent)}%</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      ) : <div className="px-4 py-8 text-center"><p className="text-sm font-medium">No completed records in the last 30 days</p><p className="mt-1 text-xs text-muted-foreground">The trend will appear after evening records are completed.</p></div>}
    </section>
  );
}
