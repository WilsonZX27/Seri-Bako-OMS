import Link from "next/link";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import type { getOutletDailyDemandTrend } from "@/server/queries/outlet-daily-records";

type Trend = Awaited<ReturnType<typeof getOutletDailyDemandTrend>>;
const rate = (received: number, wastage: number) => received > 0
  ? `${new Intl.NumberFormat("en-MY", { maximumFractionDigits: 1 }).format(wastage / received * 100)}%`
  : "No receipts";

export function OutletDailyWastageOverview({ trend }: { trend: Trend | null }) {
  if (!trend) return <section className="erp-surface p-4" role="status"><h2 className="text-sm font-semibold">Wastage summary unavailable</h2><p className="mt-1 text-sm text-muted-foreground">Reload to retry. Individual daily records remain below.</p></section>;
  const hasData = trend.coverage.reliable_lines > 0;
  const outlets = [...trend.outlets].sort((a, b) => b.wastage - a.wastage);
  return <section className="erp-surface min-w-0 overflow-hidden" aria-labelledby="wastage-overview-title">
    <div className="border-b border-[var(--sb-border-soft)] p-4">
      <h2 id="wastage-overview-title" className="text-base font-semibold">How much food are we throwing away?</h2>
      <p className="mt-1 text-xs text-muted-foreground">{formatDateOnly(trend.filters.start)} to {formatDateOnly(trend.filters.end)} · {trend.filters.branch === "all" ? "All outlets" : "Selected outlet"} · food only</p>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {[{ label: "Received", value: trend.summary.received }, { label: "Thrown away", value: trend.summary.wastage }].map((metric) => <div key={metric.label}><dt className="text-xs text-muted-foreground">{metric.label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{hasData ? formatNumber(metric.value) : "—"}</dd></div>)}
        <div><dt className="text-xs text-muted-foreground">Wastage rate</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--sb-warning)]">{hasData ? rate(trend.summary.received, trend.summary.wastage) : "—"}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">Wastage rate = thrown away ÷ received. Quantities use recorded selling units; these are not trays or RM costs.</p>
      <p className="mt-2 text-xs">Includes {trend.coverage.completed} completed outlet-days out of {trend.coverage.expected}. {trend.coverage.unavailable > 0 ? `${trend.coverage.unavailable} completed records excluded because receipt quantities are incomplete. ` : ""}Unfinished and missing records are excluded.</p>
    </div>
    <div className="p-4">
      <h3 className="text-sm font-semibold">Wastage by outlet</h3>
      <p className="mt-1 text-xs text-muted-foreground">Largest recorded wastage first. Open an outlet to inspect its daily records.</p>
      <ul className="mt-3 divide-y divide-[var(--sb-border-soft)]">
        {outlets.map((outlet) => <li key={outlet.id} className="py-3 first:pt-0">
          <div className="flex items-start justify-between gap-4"><Link className="min-w-0 text-sm font-medium text-primary underline-offset-4 hover:underline" href={`/outlet-daily-records?branch=${encodeURIComponent(outlet.id)}&history_date=${trend.filters.end}`}>{outlet.name}</Link><strong className="shrink-0 text-sm tabular-nums">{outlet.no_completed_records ? "No complete data" : rate(outlet.received, outlet.wastage)}</strong></div>
          {!outlet.no_completed_records ? <p className="mt-1 text-xs text-muted-foreground">Received {formatNumber(outlet.received)} · thrown away {formatNumber(outlet.wastage)} · {outlet.completed_records} completed day{outlet.completed_records === 1 ? "" : "s"}</p> : <p className="mt-1 text-xs text-muted-foreground">Complete the daily record and receipt quantities to include this outlet.</p>}
        </li>)}
      </ul>
      {hasData ? <details className="mt-3 border-t border-[var(--sb-border-soft)] pt-3 text-sm"><summary className="cursor-pointer font-medium text-primary">Products with the most wastage</summary><ul className="mt-2 divide-y divide-[var(--sb-border-soft)]">{trend.top_wastage_products.map((product) => <li key={product.id} className="flex justify-between gap-3 py-2"><span>{product.name}</span><span className="shrink-0 tabular-nums">{formatNumber(product.wastage)} · {rate(product.received, product.wastage)}</span></li>)}</ul></details> : null}
    </div>
  </section>;
}
