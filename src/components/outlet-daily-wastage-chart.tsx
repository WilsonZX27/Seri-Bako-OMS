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
  const innerWidth = width - inset.left - inset.right;
  const innerHeight = height - inset.top - inset.bottom;
  const maximum = Math.max(10, ...points.map((point) => point.wastage_percent));
  const x = (index: number) => inset.left + (points.length <= 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  const y = (value: number) => inset.top + innerHeight - (value / maximum) * innerHeight;
  const path = points.map((point, index) => `${index ? "L" : "M"} ${x(index).toFixed(1)} ${y(point.wastage_percent).toFixed(1)}`).join(" ");
  const average = points.length ? points.reduce((sum, point) => sum + point.wastage_percent, 0) / points.length : 0;

  const formatPercent = (value: number) => new Intl.NumberFormat("en-MY", { maximumFractionDigits: 1 }).format(value);

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
          <svg className="h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Daily wastage percentage over ${points.length} recorded days`}>
            {[0, 0.5, 1].map((ratio) => {
              const value = maximum * (1 - ratio);
              const lineY = inset.top + innerHeight * ratio;
              return <g key={ratio}><line x1={inset.left} x2={width - inset.right} y1={lineY} y2={lineY} stroke="var(--sb-border-soft)" /><text x={inset.left - 7} y={lineY + 4} textAnchor="end" fontSize="10" fill="var(--sb-text-muted)">{formatPercent(value)}%</text></g>;
            })}
            <path d={path} fill="none" stroke="var(--sb-green-700)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((point, index) => <circle key={point.id} cx={x(index)} cy={y(point.wastage_percent)} r="4" fill="var(--sb-surface-raised)" stroke="var(--sb-green-700)" strokeWidth="3"><title>{formatDateOnly(point.name)}: {formatPercent(point.wastage_percent)}% ({formatNumber(point.wastage)} wastage / {formatNumber(point.received)} received)</title></circle>)}
            <text x={inset.left} y={height - 7} fontSize="10" fill="var(--sb-text-muted)">{formatDateOnly(points[0].name)}</text>
            <text x={width - inset.right} y={height - 7} textAnchor="end" fontSize="10" fill="var(--sb-text-muted)">{formatDateOnly(points[points.length - 1].name)}</text>
          </svg>
        </div>
      ) : <div className="px-4 py-8 text-center"><p className="text-sm font-medium">No completed records in the last 30 days</p><p className="mt-1 text-xs text-muted-foreground">The trend will appear after evening records are completed.</p></div>}
    </section>
  );
}
