import { InteractiveRankingChart } from "@/components/ui/interactive-ranking-chart";
import { formatCurrency, formatNumber } from "@/lib/utils";

type ProcurementVarianceChartRow = {
  id: string;
  item_code: string;
  item_name: string;
  supplier: string;
  po_no: string;
  status: string;
  price_variance_amount: number | null;
  price_variance_percent: number | null;
  ordered_qty: number;
  received_qty: number | null;
  invoiced_qty: number | null;
};

const statusOrder = [
  "Missing invoice",
  "Missing GRN",
  "Price variance",
  "Quantity variance",
  "Review manually",
  "Not linked",
  "Matched",
];

export function ProcurementVarianceCharts({ rows, searchParams }: { rows: ProcurementVarianceChartRow[]; searchParams: Record<string, string | undefined> }) {
  if (!rows.length) return null;

  const statusItems = statusOrder
    .map((status) => ({ status, count: rows.filter((row) => row.status === status).length }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count || statusOrder.indexOf(left.status) - statusOrder.indexOf(right.status))
    .map((item) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(searchParams)) if (value) params.set(key, value);
      params.set("status", item.status.toLowerCase().replaceAll(" ", "_"));
      return {
      id: item.status.toLowerCase().replaceAll(" ", "-"),
      label: item.status,
      value: item.count,
      formattedValue: formatNumber(item.count),
      details: [`${formatNumber(item.count)} of ${formatNumber(rows.length)} comparable line(s) in the current filtered scope`],
      caution: item.status === "Matched" ? undefined : "Review the source documents before taking action",
      href: `/reports/procurement-variance?${params.toString()}`,
    };
    });

  const priceItems = rows
    .filter((row) => row.price_variance_amount != null && (Math.abs(row.price_variance_amount) > 0.01 || Math.abs(row.price_variance_percent ?? 0) > 0.02))
    .sort((left, right) => Math.abs(right.price_variance_amount ?? 0) - Math.abs(left.price_variance_amount ?? 0))
    .slice(0, 6)
    .map((row) => ({
      id: row.id,
      label: row.item_name,
      value: Math.abs(row.price_variance_amount ?? 0),
      formattedValue: formatCurrency(row.price_variance_amount ?? 0),
      details: [
        `${row.item_code} · ${row.supplier}`,
        `PO ${row.po_no}`,
        `${((row.price_variance_percent ?? 0) * 100).toFixed(1)}% price variance`,
        `Qty ${formatNumber(row.ordered_qty)} ordered / ${row.received_qty == null ? "—" : formatNumber(row.received_qty)} received / ${row.invoiced_qty == null ? "—" : formatNumber(row.invoiced_qty)} invoiced`,
      ],
      caution: "Absolute size determines rank; the displayed amount keeps its direction",
    }));

  return (
    <section className="grid gap-4 lg:grid-cols-2" aria-label="Procurement variance insights" data-procurement-variance-insights>
      <article className="overflow-hidden border bg-card">
        <div className="border-b px-3 py-2.5">
          <h2 className="text-sm font-semibold">Where review work is concentrated</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Line count by comparison result in the current filtered scope.</p>
        </div>
        <div className="p-2.5 sm:p-3">
          <InteractiveRankingChart
            items={statusItems}
            ariaLabel="Procurement variance status distribution"
            idlePrompt="Hover, tap, or focus a status to preview its share of comparable lines."
          />
        </div>
      </article>

      <article className="overflow-hidden border bg-card">
        <div className="border-b px-3 py-2.5">
          <h2 className="text-sm font-semibold">Largest price variances</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Top six PO-to-GRN warnings ranked by absolute RM difference; direction remains visible.</p>
        </div>
        <div className="p-2.5 sm:p-3">
          {priceItems.length ? (
            <InteractiveRankingChart
              items={priceItems}
              ariaLabel="Largest procurement price variances"
              idlePrompt="Hover, tap, or focus an item to preview its linked document values."
            />
          ) : (
            <p className="px-1 py-3 text-xs text-muted-foreground">No PO-to-GRN price variance above RM 0.01 or 2% exists in this filtered scope.</p>
          )}
        </div>
      </article>
    </section>
  );
}
