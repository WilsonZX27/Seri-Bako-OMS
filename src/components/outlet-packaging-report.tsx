"use client";

import { useState } from "react";
import Link from "next/link";
import { SelectNative } from "@/components/ui/select-native";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import { shiftBusinessDate } from "@/lib/business-date";
import type { getOutletPackagingReport } from "@/server/queries/outlet-packaging";

type Report = Awaited<ReturnType<typeof getOutletPackagingReport>>;

export function OutletPackagingReport({ report, days }: { report: Report; days: 7 | 30 }) {
  const [outlet, setOutlet] = useState("all");
  const [product, setProduct] = useState(report.products[0]?.code ?? "");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const latest = report.latest.filter((row) => outlet === "all" || row.branchId === outlet);
  const rows = report.rows.filter((row) => (outlet === "all" || row.branchId === outlet) && row.code === product);
  const selectedProduct = report.products.find((item) => item.code === product);
  const points = Array.from({ length: days }, (_, index) => {
    const date = shiftBusinessDate(report.today, index + 1 - days);
    const daily = rows.filter((row) => row.date === date);
    return { date, rows: daily, value: daily.length ? daily.reduce((sum, row) => sum + row.usage, 0) : null };
  });
  const maximum = Math.max(1, ...points.map((point) => point.value ?? 0));
  const selected = points.find((point) => point.date === selectedDate);
  const count = outlet === "all" ? report.outlets.length : 1;

  return <div className="space-y-5" data-packaging-report>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <SelectNative aria-label="Outlet" className="w-full sm:w-64" value={outlet} onChange={(event) => { setOutlet(event.target.value); setSelectedDate(null); }}>
        <option value="all">All outlets</option>
        {report.outlets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </SelectNative>
      <Link href="/outlet-daily-records" className="inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">Daily Records ↗</Link>
    </div>
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
    <section className="erp-surface overflow-hidden" aria-labelledby="packaging-stock-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
        <h2 id="packaging-stock-title" className="text-sm font-semibold">Latest outlet stock</h2>
        <span className="text-xs text-muted-foreground">Recorded closing balances</span>
      </div>
      <div className="divide-y">
        {report.products.map((item) => {
          const balances = latest.filter((row) => row.code === item.code && row.closing !== null);
          const total = balances.reduce((sum, row) => sum + (row.closing ?? 0), 0);
          const dates = balances.map((row) => row.date).sort();
          return <details key={item.id} className="group">
            <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-muted/40 active:bg-muted focus-visible:outline-primary">
              <div className="min-w-0"><span className="text-sm font-medium">{item.name}</span><p className="mt-0.5 text-xs text-muted-foreground">{balances.length}/{count} outlets{dates.length ? ` · ${formatDateOnly(dates[0])}${dates[0] !== dates.at(-1) ? ` – ${formatDateOnly(dates.at(-1)!)}` : ""}` : " · No closing record"}</p></div>
              <div className="flex items-center gap-4"><span className="text-base font-semibold tabular-nums">{balances.length ? formatNumber(total) : "—"}<span className="ml-1 text-xs font-normal text-muted-foreground">{item.unit}</span></span><span className="text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true">›</span></div>
            </summary>
            <div className="max-h-64 overflow-y-auto border-t bg-muted/20 px-4 py-1">
              {report.outlets.filter((item) => outlet === "all" || item.id === outlet).map((branch) => {
                const balance = balances.find((row) => row.branchId === branch.id);
                return <div key={branch.id} className="flex items-center justify-between gap-4 py-2 text-xs"><div className="min-w-0"><p className="font-medium">{branch.name}</p><p className="text-muted-foreground">{balance ? formatDateOnly(balance.date) : "No closing record"}</p></div><span className="shrink-0 tabular-nums">{balance ? `${formatNumber(balance.closing ?? 0)} ${item.unit}` : "—"}</span></div>;
              })}
            </div>
          </details>;
        })}
        {!report.products.length && <p className="p-6 text-sm text-muted-foreground">No packaging products in Daily Records yet.</p>}
      </div>
    </section>
    <section className="erp-surface overflow-hidden" aria-labelledby="packaging-trend-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <h2 id="packaging-trend-title" className="text-sm font-semibold">Usage trend</h2>
        <div className="flex flex-wrap items-center gap-3">
          <SelectNative aria-label="Packaging" className="w-full sm:w-56" value={product} onChange={(event) => { setProduct(event.target.value); setSelectedDate(null); }}>
            {report.products.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}
          </SelectNative>
          <nav aria-label="Report period" className="inline-flex rounded-[calc(var(--sb-radius-control)+3px)] bg-muted p-[3px]">
            {[7, 30].map((value) => <Link key={value} href={`?days=${value}`} aria-current={days === value ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-[var(--sb-radius-control)] px-3 text-sm font-medium transition-colors motion-reduce:transition-none ${days === value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground active:bg-white/60"}`}>{value} days</Link>)}
          </nav>
        </div>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span className="font-medium">{selectedProduct?.name ?? "Packaging"}</span><span className="text-muted-foreground"><strong className="font-semibold text-foreground tabular-nums">{rows.length ? formatNumber(rows.reduce((sum, row) => sum + row.usage, 0)) : "—"}</strong> {selectedProduct?.unit} used</span></div>
        <p className="mt-4 text-xs tabular-nums text-muted-foreground">{formatNumber(maximum)} {selectedProduct?.unit}</p>
        <div role="group" tabIndex={0} className="mt-2 flex h-48 items-end gap-1 border-b rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Daily packaging usage. Use arrow keys to select a day." onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const current = Math.max(0, points.findIndex((point) => point.date === selectedDate));
          const index = event.key === "Home" ? 0 : event.key === "End" ? points.length - 1 : Math.max(0, Math.min(points.length - 1, current + (event.key === "ArrowLeft" ? -1 : 1)));
          setSelectedDate(points[index].date);
        }}>
          {points.map((point) => <button key={point.date} type="button" tabIndex={-1} onClick={() => setSelectedDate(point.date)} aria-pressed={selectedDate === point.date} aria-label={`${formatDateOnly(point.date)}: ${point.value === null ? "No completed records" : `${formatNumber(point.value)} ${selectedProduct?.unit}, ${point.rows.length}/${count} outlets`}`} className="group relative flex h-full min-w-0 flex-1 items-end justify-center rounded-t focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" title={`${formatDateOnly(point.date)} · ${point.value ?? "No record"}`}>
            <span className={`w-full max-w-10 rounded-t transition-colors motion-reduce:transition-none ${point.value === null ? "border-t border-dashed border-muted-foreground" : selectedDate === point.date ? "bg-primary" : "bg-primary/65 group-hover:bg-primary"}`} style={{ height: point.value === null ? 3 : Math.max(3, point.value / maximum * 176) }} />
          </button>)}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{formatDateOnly(points[0].date)}</span><span>{formatDateOnly(report.today)}</span></div>
        <p className="mt-3 text-xs text-muted-foreground">{points.filter((point) => point.value !== null).length}/{days} days recorded · select a day for details</p>
        {selected && <div className="mt-4 border-t pt-3" aria-live="polite"><div className="flex justify-between gap-3 text-sm"><strong>{formatDateOnly(selected.date)}</strong><span>{selected.value === null ? "No completed records" : `${formatNumber(selected.value)} ${selectedProduct?.unit}`}</span></div><p className="mt-1 text-xs text-muted-foreground">{selected.rows.length}/{count} outlets recorded</p><div className="mt-2 max-h-48 overflow-y-auto">{selected.rows.map((row) => <div key={row.id} className="flex justify-between gap-4 py-1.5 text-xs"><span>{row.branch}</span><span className="tabular-nums">{formatNumber(row.usage)} {row.unit}</span></div>)}</div></div>}
      </div>
    </section>
    </div>
  </div>;
}
