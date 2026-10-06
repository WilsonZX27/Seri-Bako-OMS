"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { Button, buttonVariants } from "@/components/ui/button";
import { InteractiveLineChart } from "@/components/ui/interactive-line-chart";
import { FilterBar } from "@/components/ui/filter-bar";
import { SectionLoadingState } from "@/components/ui/system-states";
import { SelectNative } from "@/components/ui/select-native";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import { shiftBusinessDate } from "@/lib/business-date";
import type { getOutletPackagingReport } from "@/server/queries/outlet-packaging";

type Report = Awaited<ReturnType<typeof getOutletPackagingReport>>;

export function OutletPackagingReport({ report, days: initialDays }: { report: Report; days: 7 | 30 }) {
  const days = initialDays;
  const router = useRouter();
  const [periodPending, startPeriodTransition] = useTransition();
  const [requestedDays, setRequestedDays] = useState(initialDays);
  const [outlet, setOutlet] = useState("all");
  const [product, setProduct] = useState(report.products[0]?.code ?? "");
  const [measure,setMeasure]=useState<"usage"|"closing">("closing");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const changePeriod = (nextDays: 7 | 30) => {
    setRequestedDays(nextDays);
    setSelectedDate(null);
    const url = new URL(window.location.href);
    url.searchParams.set("days", String(nextDays));
    startPeriodTransition(() => router.replace(`${url.pathname}${url.search}`, { scroll: false }));
  };
  const latest = useMemo(() => report.latest.filter((row) => outlet === "all" || row.branchId === outlet), [report.latest, outlet]);
  const start = shiftBusinessDate(report.today, 1 - days);
  const rows = useMemo(() => report.rows.filter(row => row.date >= start && (outlet === "all" || row.branchId === outlet) && row.code === product), [report.rows, start, outlet, product]);
  const selectedProduct = report.products.find((item) => item.code === product);
  const points = useMemo(() => {
    // Group once, rather than scan every report row again for each day and chart click.
    const byDate = new Map<string, Report["rows"]>();
    for (const row of rows) {
      const group = byDate.get(row.date) ?? [];
      group.push(row); byDate.set(row.date, group);
    }
    return Array.from({ length: days }, (_, index) => {
      const date = shiftBusinessDate(report.today, index + 1 - days);
      const daily = byDate.get(date) ?? [];
      return { date, rows: daily, value: daily.length ? measure === "usage" ? daily.reduce((sum, row) => sum + row.usage, 0) : daily.some(row=>row.closing==null) ? null : daily.reduce((sum,row)=>sum+(row.closing??0),0) : null };
    });
  }, [rows, report.today, days, measure]);
  const balances=latest.filter(row=>row.code===product&&row.closing!==null);
  const balanceTotal=balances.reduce((sum,row)=>sum+(row.closing??0),0);
  const maximum = Math.max(1, ...points.map((point) => point.value ?? 0));
  const selected = points.find((point) => point.date === selectedDate);
  const count = outlet === "all" ? report.outlets.length : 1;

  const rail = <>
    <ConsoleSection title="Packaging actions" kind="action">
      <Link href="/outlet-daily-records" className={buttonVariants({ variant: "secondary", className: "w-full" })}>Open Daily Records</Link>
    </ConsoleSection>
    <ConsoleSection title={selected ? "Selected day" : "Report coverage"} kind="status">
      {periodPending ? <SectionLoadingState label="Loading packaging report coverage" /> : <>
      <p className="text-sm font-semibold">{selectedProduct?.name ?? "Packaging"}</p>
      <p>{outlet === "all" ? "All outlets" : report.outlets.find((item) => item.id === outlet)?.name}</p>
      <div className="flex justify-between gap-3"><span>Period</span><span>{days} days</span></div>
      <div className="flex justify-between gap-3"><span>Days recorded</span><span className="tabular-nums">{points.filter((point) => point.value !== null).length}/{days}</span></div>
      {selected ? <div className="border-t pt-3" aria-live="polite">
        <p className="font-semibold">{formatDateOnly(selected.date)}</p>
        <p className="mt-1 text-muted-foreground">{selected.value === null ? "No completed records" : `${formatNumber(selected.value)} ${selectedProduct?.unit} ${measure==="usage"?"used":"closing"} · ${selected.rows.length}/${count} outlets`}</p>
        <div className="mt-2 max-h-64 overflow-y-auto">{selected.rows.map((row) => <div key={row.id} className="flex justify-between gap-3 py-2"><span>{row.branch}</span><span className="shrink-0 tabular-nums">{formatNumber(measure==="usage"?row.usage:row.closing??0)} {row.unit}</span></div>)}</div>
      </div> : <p className="text-muted-foreground">Select a day for outlet details.</p>}
      </>}
    </ConsoleSection>
  </>;
  return <WorkspaceGrid tabletCanvas="wide" rightRail={rail} tabletRailBreakpoint="lg">
  <div className="space-y-4" data-packaging-report>
    <FilterBar resetHref="/outlet-packaging" phoneMode="inline" className="gap-3">
      <SelectNative aria-label="Outlet" className="w-full sm:w-64" value={outlet} onChange={(event) => { setOutlet(event.target.value); setSelectedDate(null); }}>
        <option value="all">All outlets</option>
        {report.outlets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </SelectNative>
      <SelectNative aria-label="Packaging" className="w-full sm:w-56" value={product} onChange={(event) => { setProduct(event.target.value); setSelectedDate(null); }}>
        {report.products.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}
      </SelectNative>
      <SelectNative aria-label="Report period" className="w-full sm:w-32" value={periodPending ? requestedDays : days} disabled={periodPending} aria-busy={periodPending || undefined} onChange={(event) => changePeriod(event.target.value === "30" ? 30 : 7)}><option value="7">7 days</option><option value="30">30 days</option></SelectNative>
    </FilterBar>
    <section className="grid grid-cols-2 divide-x border-y py-3" aria-label="Selected packaging summary"><div className="px-3"><span className="text-xs text-muted-foreground">Latest recorded balance</span><strong className="block text-2xl tabular-nums">{balances.length?formatNumber(balanceTotal):"—"} <span className="text-sm font-normal">{selectedProduct?.unit}</span></strong><p className="text-xs text-muted-foreground">{balances.length}/{count} outlets · dates may differ</p></div><div className="px-3"><span className="text-xs text-muted-foreground">{days}-day usage</span><strong className="block text-2xl tabular-nums">{periodPending?"Loading…":rows.length?formatNumber(rows.reduce((n,r)=>n+r.usage,0)):"—"} <span className="text-sm font-normal">{selectedProduct?.unit}</span></strong><p className="text-xs text-muted-foreground">Completed records only</p></div></section>
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
    <section className="erp-surface overflow-hidden" aria-labelledby="packaging-stock-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
        <h2 id="packaging-stock-title" className="text-sm font-semibold">Packaging balances</h2>
        <span className="text-xs text-muted-foreground">Recorded closing balances</span>
      </div>
      <div className="divide-y">
        {report.products.map((item) => {
          const balances = latest.filter((row) => row.code === item.code && row.closing !== null);
          const total = balances.reduce((sum, row) => sum + (row.closing ?? 0), 0);
          const dates = balances.map((row) => row.date).sort();
          return <details key={item.id} className={`group ${product===item.code?"bg-muted/30":""}`} >
            <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-muted/40 active:bg-muted focus-visible:outline-primary">
              <div className="min-w-0"><button type="button" className="text-left text-sm font-medium underline-offset-4 hover:underline" onClick={e=>{e.preventDefault();setProduct(item.code);setSelectedDate(null);}}>{item.name}</button><p className="mt-0.5 text-xs text-muted-foreground">{balances.length}/{count} outlets{dates.length ? ` · ${formatDateOnly(dates[0])}${dates[0] !== dates.at(-1) ? ` – ${formatDateOnly(dates.at(-1)!)}` : ""}` : " · No closing record"}</p></div>
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
        <h2 id="packaging-trend-title" className="text-sm font-semibold">Daily trend</h2><div className="flex gap-1"><Button size="sm" variant={measure==="closing"?"secondary":"ghost"} aria-pressed={measure==="closing"} onClick={()=>{setMeasure("closing");setSelectedDate(null);}}>Balance</Button><Button size="sm" variant={measure==="usage"?"secondary":"ghost"} aria-pressed={measure==="usage"} onClick={()=>{setMeasure("usage");setSelectedDate(null);}}>Usage</Button></div>
      </div>
      <div className="p-4">
        <p className="text-sm font-medium">{selectedProduct?.name??"Packaging"} · {measure==="usage"?"Usage":"Closing balance"}</p>
        <div className="mt-4 h-64" key={`${outlet}:${product}:${days}:${measure}`}>
          {periodPending ? <SectionLoadingState label="Loading packaging trend" /> : <InteractiveLineChart compact width={600} height={256} inset={{ top: 20, right: 12, bottom: 28, left: 42 }} maximum={maximum} maximumFractionDigits={0}
            ariaLabel={`${selectedProduct?.name ?? "Packaging"} daily ${measure==="usage"?"usage":"closing balance"}`} onSelectPoint={setSelectedDate}
            points={points.map((point) => ({ id: point.date, label: formatDateOnly(point.date), value: point.value,
              previewValue: point.value === null ? "No completed records" : `${formatNumber(point.value)} ${selectedProduct?.unit}`,
              previewDetails: [`${point.rows.length}/${count} outlets recorded`],
            }))} />}
        </div>
        {!periodPending ? <p className="mt-3 text-xs text-muted-foreground">{points.filter((point) => point.value !== null).length}/{days} days recorded · select a day for details</p> : null}

      </div>
    </section>
    </div>
  </div>
  </WorkspaceGrid>;
}
