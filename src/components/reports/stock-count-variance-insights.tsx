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
    {!insight.available ? <div className="px-4 py-7 text-center" role="status" aria-label="Variance insight unavailable" data-unavailable-guidance="no unavailable result is shown as zero"><p className="text-sm font-medium">Variance data is temporarily unavailable</p><p className="mt-1 text-xs text-muted-foreground">Stock Count records are unaffected. Retry the page to load this read-only insight.</p></div> : <>
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
    </>}
  </section>;
}

export function StockCountVarianceDaily({ insight }: { insight: Insight }) {
  const total = insight.daily.reduce((sum, row) => sum + row.high_variance_count, 0);
  return <section className="erp-surface overflow-hidden" aria-labelledby="stock-count-daily-title">
    <div className="border-b border-[var(--sb-border-soft)] px-3 py-2.5"><h2 id="stock-count-daily-title" className="text-sm font-semibold">Daily variance</h2><p className="mt-0.5 text-xs text-muted-foreground">{formatNumber(total)} posted lines requiring attention</p></div>
    <div className="max-h-80 divide-y divide-[var(--sb-border-soft)] overflow-y-auto px-3" role="list" aria-label="Daily above-tolerance Stock Count variance" data-stock-count-variance-daily-list>{insight.daily.map((row) => <Link key={row.row_key} role="listitem" href={`/stock-counts?status=posted&from=${row.record_date}&to=${row.record_date}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2.5 text-xs hover:text-primary"><span>{formatDateOnly(row.record_date)}</span><span className="tabular-nums"><strong>{formatNumber(row.high_variance_count)}</strong> · {formatNumber(row.shortage_count)} short · {formatNumber(row.overage_count)} over</span></Link>)}</div>
  </section>;
}
