import { insightDelta } from "@/lib/outlet-insight-period";
import { formatNumber } from "@/lib/utils";

type MetricSource = { summary: { received: number; wastage: number }; coverage: { reliable_lines: number } };
const formatRate = (value: number) => new Intl.NumberFormat("en-MY", { maximumFractionDigits: 1 }).format(value);

/** Display precision only; comparisons use the original quantities and weighted rates. */
export function OutletDailyInsightMetrics({ trend, previous, compare }: { trend: MetricSource; previous: MetricSource | null; compare: boolean }) {
  const comparable = Boolean(trend.coverage.reliable_lines && previous?.coverage.reliable_lines);
  const metrics = [
    { label: "Received", current: trend.summary.received, prior: previous?.summary.received, rate: false },
    { label: "Wastage", current: trend.summary.wastage, prior: previous?.summary.wastage, rate: false },
    { label: "Wastage rate", current: trend.summary.received > 0 ? trend.summary.wastage / trend.summary.received * 100 : null, prior: previous && previous.summary.received > 0 ? previous.summary.wastage / previous.summary.received * 100 : null, rate: true },
  ];
  return <dl className="sb-daily-insights-metrics sb-work-surface grid grid-cols-3 divide-x divide-[var(--sb-border-soft)] text-xs">
    {metrics.map(metric => {
      const current = trend.coverage.reliable_lines ? metric.current : null;
      const prior = previous?.coverage.reliable_lines ? metric.prior ?? null : null;
      const delta = insightDelta(current, prior);
      const value = (number: number | null) => number === null ? "—" : `${metric.rate ? formatRate(number) : formatNumber(number)}${metric.rate ? "%" : ""}`;
      return <div key={metric.label} className="min-w-0 p-3 sm:p-4">
        <dt className="text-muted-foreground">{metric.label}</dt>
        <dd className="mt-1 break-words text-lg font-semibold tabular-nums sm:text-xl">{value(current)}</dd>
        {compare && comparable ? <dd className="mt-2 space-y-1 tabular-nums">
          <p className="text-muted-foreground">Previous {value(prior)}</p>
          <p className={metric.label !== "Received" && delta?.absolute ? delta.absolute > 0 ? "text-[var(--sb-danger)]" : "text-[var(--sb-success)]" : "text-muted-foreground"}>{delta ? `${delta.absolute > 0 ? "+" : ""}${metric.rate ? formatRate(delta.absolute) : formatNumber(delta.absolute)}${metric.rate ? " pp" : delta.percent === null ? " · no % baseline" : ` (${delta.percent > 0 ? "+" : ""}${formatRate(delta.percent)}%)`}` : "No comparable data"}</p>
        </dd> : null}
      </div>;
    })}
  </dl>;
}
