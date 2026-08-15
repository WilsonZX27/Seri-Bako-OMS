"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { InteractiveLineChart } from "@/components/ui/interactive-line-chart";
import { InteractiveRankingChart } from "@/components/ui/interactive-ranking-chart";
import { formatDateOnly, formatNumber, formatQuantity } from "@/lib/utils";
import type { StockCountVarianceInsightRow } from "@/server/queries/stock-counts";

type Insight = { available: boolean; daily: StockCountVarianceInsightRow[]; items: StockCountVarianceInsightRow[]; branches: StockCountVarianceInsightRow[] };
type View = "trend" | "items" | "branches";

const signed = (value: number | null) => value == null ? "—" : `${value > 0 ? "+" : ""}${formatQuantity(value)}`;

export function StockCountVarianceInsights({ insight }: { insight: Insight }) {
  const [view, setView] = useState<View>("trend");
  const total = insight.daily.reduce((sum, row) => sum + row.high_variance_count, 0);
  const shortage = insight.daily.reduce((sum, row) => sum + row.shortage_count, 0);
  const overage = insight.daily.reduce((sum, row) => sum + row.overage_count, 0);
  const start = insight.daily[0]?.record_date ?? "";
  const end = insight.daily.at(-1)?.record_date ?? "";
  const chartPoints = insight.daily.map((row) => ({
    id: row.row_key,
    label: formatDateOnly(row.record_date),
    value: row.high_variance_count,
    previewValue: `${formatNumber(row.high_variance_count)} above tolerance`,
    previewDetails: [`${formatNumber(row.shortage_count)} shortage`, `${formatNumber(row.overage_count)} overage`],
  }));
  const maximum = Math.max(1, ...chartPoints.map((point) => point.value));
  const rankingItems = useMemo(() => insight.items.map((row) => ({
    id: row.row_key,
    label: row.row_label,
    value: row.high_variance_count,
    formattedValue: `${formatNumber(row.high_variance_count)}×`,
    details: [`${formatNumber(row.shortage_count)} shortage`, `${formatNumber(row.overage_count)} overage`, `Latest ${signed(row.latest_variance_percent)}%`, `${signed(row.latest_variance_qty)} ${row.latest_uom ?? "UOM unavailable"}`, row.latest_count_no ?? "Count unavailable"],
    href: row.latest_count_id ? `/stock-counts/${row.latest_count_id}` : undefined,
  })), [insight.items]);
  const rankingBranches = useMemo(() => insight.branches.map((row) => ({
    id: row.row_key,
    label: row.row_label,
    value: row.high_variance_count,
    formattedValue: `${formatNumber(row.high_variance_count)}×`,
    details: [`${formatNumber(row.shortage_count)} shortage`, `${formatNumber(row.overage_count)} overage`, `Latest ${signed(row.latest_variance_percent)}%`, row.latest_count_no ?? "Count unavailable"],
    href: start && end ? `/stock-counts?branch_id=${row.entity_id}&status=posted&from=${start}&to=${end}` : undefined,
  })), [end, insight.branches, start]);

  return <section className="erp-surface overflow-hidden" aria-labelledby="stock-count-variance-title" data-stock-count-variance-insights>
    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--sb-border-soft)] px-3 py-2.5">
      <div><h2 id="stock-count-variance-title" className="text-sm font-semibold">30-day posted variance</h2><p className="text-xs text-muted-foreground">Lines beyond each count&apos;s saved tolerance · quantities are never combined across UOMs</p></div>
      {insight.available ? <p className="text-xs text-muted-foreground"><strong className="text-foreground">{formatNumber(total)}</strong> occurrences · {formatNumber(shortage)} shortage · {formatNumber(overage)} overage</p> : null}
    </div>
    {!insight.available ? <div className="px-4 py-7 text-center"><p className="text-sm font-medium">Variance insight unavailable</p><p className="mt-1 text-xs text-muted-foreground">The Stock Count list remains available; no unavailable result is shown as zero.</p></div> : <>
      <div className="flex gap-1 border-b border-[var(--sb-border-soft)] px-3 py-2" role="tablist" aria-label="Stock count variance view">
        {(["trend", "items", "branches"] as const).map((option) => <button key={option} type="button" role="tab" aria-selected={view === option} onClick={() => setView(option)} className={`min-h-11 rounded-[var(--sb-radius-control)] px-3 text-xs font-medium xl:min-h-9 ${view === option ? "bg-[var(--sb-green-900)] text-[var(--sb-text-inverse)]" : "text-muted-foreground hover:bg-[var(--sb-surface-muted)]"}`}>{option === "trend" ? "Daily trend" : option === "items" ? "Repeat items" : "Branches"}</button>)}
      </div>
      <div className="px-3 py-3">
        {view === "trend" ? total ? <>
          <InteractiveLineChart points={chartPoints} width={680} height={210} inset={{ top: 18, right: 18, bottom: 30, left: 42 }} maximum={maximum} maximumFractionDigits={0} ariaLabel="Daily posted Stock Count lines above their saved tolerance" />
          <p className="mt-1 text-center text-[11px] text-muted-foreground"><span className="hidden sm:inline">Hover or focus, then use arrow keys for exact values.</span><span className="sm:hidden">Tap or drag for exact values.</span></p>
        </> : <div className="py-7 text-center"><p className="text-sm font-medium">No above-tolerance posted variance</p><p className="mt-1 text-xs text-muted-foreground">All posted lines in this period stayed within their count&apos;s saved tolerance.</p></div> : null}
        {view === "items" ? rankingItems.length ? <InteractiveRankingChart items={rankingItems} ariaLabel="Items with repeated above-tolerance Stock Count variance" idlePrompt="Hover, tap, or focus an item to preview its latest signed variance. Open a row for the latest count." /> : <p className="py-7 text-center text-xs text-muted-foreground">No repeat item variance in this period.</p> : null}
        {view === "branches" ? rankingBranches.length ? <InteractiveRankingChart items={rankingBranches} ariaLabel="Branches with above-tolerance Stock Count variance" idlePrompt="Hover, tap, or focus a branch to preview its variance mix. Open a row for the filtered count list." /> : <p className="py-7 text-center text-xs text-muted-foreground">No branch variance in this period.</p> : null}
      </div>
      <details className="border-t border-[var(--sb-border-soft)] px-3 py-2 text-xs"><summary className="cursor-pointer font-medium text-primary">Daily data · {formatNumber(total)} above-tolerance lines</summary><div className="mt-2 max-h-64 overflow-y-auto"><div className="divide-y divide-[var(--sb-border-soft)] sm:hidden" role="list" aria-label="Daily above-tolerance Stock Count variance" data-stock-count-variance-daily-list>{insight.daily.map((row) => <div key={row.row_key} className="grid gap-2 py-2.5 first:pt-0" role="listitem"><Link className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" href={`/stock-counts?status=posted&from=${row.record_date}&to=${row.record_date}`}>{formatDateOnly(row.record_date)}</Link><dl className="grid grid-cols-3 gap-2 text-[11px]"><div><dt className="text-muted-foreground">Shortage</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(row.shortage_count)}</dd></div><div><dt className="text-muted-foreground">Overage</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(row.overage_count)}</dd></div><div><dt className="text-muted-foreground">All</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(row.high_variance_count)}</dd></div></dl></div>)}</div><table className="hidden w-full text-left sm:table"><thead><tr className="border-b text-muted-foreground"><th className="py-1.5 pr-3 font-medium">Date</th><th className="px-3 py-1.5 text-right font-medium">Shortage</th><th className="px-3 py-1.5 text-right font-medium">Overage</th><th className="py-1.5 pl-3 text-right font-medium">All</th></tr></thead><tbody>{insight.daily.map((row) => <tr key={row.row_key} className="border-b border-[var(--sb-border-soft)]"><td className="py-1.5 pr-3"><Link className="text-primary underline-offset-4 hover:underline" href={`/stock-counts?status=posted&from=${row.record_date}&to=${row.record_date}`}>{formatDateOnly(row.record_date)}</Link></td><td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(row.shortage_count)}</td><td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(row.overage_count)}</td><td className="py-1.5 pl-3 text-right tabular-nums">{formatNumber(row.high_variance_count)}</td></tr>)}</tbody></table></div></details>
    </>}
  </section>;
}
