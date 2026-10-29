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
import { SelectControl } from "@/components/ui/select-control";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import { packagingTrendPoints } from "@/lib/packaging-trend";
import { shiftBusinessDate } from "@/lib/business-date";
import type { getOutletPackagingReport } from "@/server/queries/outlet-packaging";

type Report = Awaited<ReturnType<typeof getOutletPackagingReport>>;

export function OutletPackagingReport({ report, days: initialDays, canManageStores = false }: { report: Report; days: 7 | 30; canManageStores?:boolean }) {
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
  const points = useMemo(()=>packagingTrendPoints(report,outlet,product,days,measure),[report,outlet,product,days,measure]);
  const balances=latest.filter(row=>row.code===product&&row.closing!==null);
  const countDates = latest.filter(row=>row.closing!==null).map(row=>row.date).sort();
  const countPeriod = countDates.length ? `${formatDateOnly(countDates[0])}${countDates[0]!==countDates.at(-1) ? ` – ${formatDateOnly(countDates.at(-1)!)}` : ""}` : "Not counted";
  const balanceTotal=balances.reduce((sum,row)=>sum+(row.closing??0),0);
  const maximum = Math.max(1, ...points.map((point) => point.value ?? 0));
  const selected = points.find((point) => point.date === selectedDate);
  const count = outlet === "all" ? report.outlets.length : 1;

  const rail = <>
    <ConsoleSection title="Packaging actions" kind="action">
      {canManageStores ? <Link href="/outlet-packaging/stores" className={buttonVariants({variant:"outline",className:"w-full border-[var(--sb-text-muted)]"})}>Store balances and movements</Link> : null}
      <Link href="/outlet-daily-records" className={buttonVariants({ variant: "secondary", className: "w-full" })}>Open Daily Records</Link>
    </ConsoleSection>
    <ConsoleSection title={selected ? "Selected day" : "Report coverage"} kind="status">
      {periodPending ? <SectionLoadingState label="Loading packaging report coverage" /> : <>
      <p className="text-sm font-semibold">{selectedProduct?.name ?? "Packaging"}</p>
      <p className="break-words">{outlet === "all" ? "All outlets" : report.outlets.find((item) => item.id === outlet)?.name}</p>
      <div className="flex justify-between gap-3"><span>Period</span><span>{days} days</span></div>
      <div className="flex justify-between gap-3"><span>Days recorded</span><span className="tabular-nums">{points.filter((point) => point.value !== null).length}/{days}</span></div>
      {selected ? <div className="border-t pt-3" aria-live="polite">
        <p className="font-semibold">{formatDateOnly(selected.date)}</p>
        <p className="mt-1 text-muted-foreground">{selected.value === null ? measure==="usage"?"Incomplete usage coverage":"Incomplete balance coverage" : `${formatNumber(selected.value)} ${selectedProduct?.unit} ${measure==="usage"?"used":"recorded balance"} · ${new Set(selected.rows.map(row=>row.branchId)).size}/${count} outlets`}</p>
        <div className="mt-2 divide-y">{selected.rows.map((row) => <div key={row.id} className="flex justify-between gap-3 py-2"><span className="min-w-0 flex-1 break-words"><Link className="underline underline-offset-4" href={`/outlet-daily-records/${row.id.split(":")[0]}`}>{row.branch}</Link>{measure==="closing"?<time className="block text-muted-foreground">{formatDateOnly(row.date)}</time>:null}</span><span className="shrink-0 tabular-nums">{(measure==="usage" && row.usage===null ? "Unknown" : formatNumber(measure==="usage"?row.usage:row.closing))} {row.unit}</span></div>)}</div><div className="mt-3 flex justify-between border-t pt-3 font-semibold"><span>Total</span><span>{selected.value === null ? "Unknown" : formatNumber(selected.value)} {selectedProduct?.unit}</span></div>
      </div> : <p className="text-muted-foreground">{measure==="closing"?"Last confirmed closing per outlet; select a day for record dates.":"Select a day for outlet usage."}</p>}
      </>}
    </ConsoleSection>
  </>;
  return <WorkspaceGrid tabletCanvas="wide" rightRail={rail} tabletRailMode="context">
  <div className="space-y-4" data-packaging-report>
    {/* Outlet/product are local state; only changePeriod owns server navigation. */}
    <FilterBar resetHref="/outlet-packaging" phoneMode="inline" className="gap-3" onSubmit={(event) => event.preventDefault()}>
      <SelectControl ariaLabel="Outlet" className="w-full sm:w-64" value={outlet} onValueChange={selectedValue => { setOutlet(selectedValue); setSelectedDate(null); }} options={[({value: "all", label: "All outlets"}), ...(report.outlets.map((item) => ({value: String((item.id) ?? ""), label: String((item.name) ?? "")})))]}/>
      <SelectControl ariaLabel="Packaging" className="w-full sm:w-56 lg:hidden" value={product} onValueChange={selectedValue => { setProduct(selectedValue); setSelectedDate(null); }} options={[...(report.products.map((item) => ({value: String((item.code) ?? ""), label: String((item.name) ?? "")})))]}/>
      <SelectControl ariaLabel="Report period" className="w-full sm:w-32" value={periodPending ? requestedDays : days} disabled={periodPending} aria-busy={periodPending || undefined} onValueChange={selectedValue => changePeriod(selectedValue === "30" ? 30 : 7)} options={[({value: "7", label: "7 days"}), ({value: "30", label: "30 days"})]}/>
    </FilterBar>
    <section className="grid grid-cols-2 divide-x border-y py-3" aria-label="Selected packaging summary"><div className="px-3"><span className="text-xs text-muted-foreground">Last counted balance</span><strong className="block text-2xl tabular-nums">{balances.length?formatNumber(balanceTotal):"—"} <span className="text-sm font-normal">{selectedProduct?.unit}</span></strong><p className="text-xs text-muted-foreground">{balances.length}/{count} outlets · dates may differ</p></div><div className="px-3"><span className="text-xs text-muted-foreground">{days}-day usage</span><strong className="block text-2xl tabular-nums">{periodPending?"Loading…":rows.length?rows.every(row=>row.usage!==null)?formatNumber(rows.reduce((n,r)=>n+(r.usage ?? 0),0)):"Unknown":"—"} <span className="text-sm font-normal">{selectedProduct?.unit}</span></strong><p className="text-xs text-muted-foreground">Completed records only</p></div></section>
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
    <section className="erp-surface overflow-hidden" aria-labelledby="packaging-stock-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
        <h2 id="packaging-stock-title" className="text-sm font-semibold">Last counted balances</h2>
        <span className="text-xs text-muted-foreground">Counts: {countPeriod} · select an item</span>
      </div>
      <div className="divide-y">
        {report.products.map((item) => {
          const balances = latest.filter((row) => row.code === item.code && row.closing !== null);
          const total = balances.reduce((sum, row) => sum + (row.closing ?? 0), 0);
          return <div key={item.id} className={product===item.code ? "bg-[var(--sb-green-100)]" : ""}>
            <div className="flex items-stretch">
              <button type="button" aria-pressed={product===item.code} aria-controls="packaging-trend-panel" onClick={() => { setProduct(item.code); setSelectedDate(null); }} className="flex min-h-16 min-w-0 flex-1 items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
                <span className="min-w-0"><span className="block text-sm font-medium">{item.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{balances.length}/{count} outlets{!balances.length ? " · Not counted" : ""}</span></span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{balances.length ? formatNumber(total) : "—"}<span className="ml-1 text-xs font-normal text-muted-foreground">{item.unit}</span></span>
              </button>
            </div>
          </div>;
        })}
        {!report.products.length && <p className="p-6 text-sm text-muted-foreground">No packaging products in Daily Records yet.</p>}
      </div>
    </section>
    <section className="erp-surface overflow-hidden" id="packaging-trend-panel" aria-labelledby="packaging-trend-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <h2 id="packaging-trend-title" className="text-sm font-semibold">Daily trend</h2><div className="flex gap-1"><Button size="sm" variant={measure==="closing"?"secondary":"ghost"} aria-pressed={measure==="closing"} onClick={()=>{setMeasure("closing");setSelectedDate(null);}}>Balance</Button><Button size="sm" variant={measure==="usage"?"secondary":"ghost"} aria-pressed={measure==="usage"} onClick={()=>{setMeasure("usage");setSelectedDate(null);}}>Usage</Button></div>
      </div>
      <div className="p-4">
        <p className="text-sm font-medium">{selectedProduct?.name??"Packaging"} · {measure==="usage"?"Usage":"Recorded balance"}</p>
        <div className={points.some(point=>point.value!==null) || periodPending ? "mt-4 h-64" : "mt-4 flex min-h-32 items-center"} key={`${outlet}:${product}:${days}:${measure}`}>
          {periodPending ? <SectionLoadingState label="Loading packaging trend" /> : !points.some(point=>point.value!==null) ? <div role="status" className="text-sm"><p className="font-medium">No complete {measure=== "closing" ? "balance" : "usage"} history for this period</p><p className="mt-1 text-xs text-muted-foreground">{outlet=== "all" ? "Choose an outlet to inspect its recorded history. Missing counts are not zero." : "Completed records will appear here. Missing counts are not zero."}</p></div> : <InteractiveLineChart compact width={600} height={256} inset={{ top: 20, right: 12, bottom: 28, left: 42 }} maximum={maximum} maximumFractionDigits={0}
            ariaLabel={`${selectedProduct?.name ?? "Packaging"} daily ${measure==="usage"?"usage":"closing balance"}`} onSelectPoint={setSelectedDate}
            points={points.map((point) => ({ id: point.date, label: formatDateOnly(point.date), value: point.value,
              previewValue: point.value === null ? (measure==="closing"?"Incomplete balance coverage":point.rows.length ? "Incomplete usage coverage" : "No completed records") : `${formatNumber(point.value)} ${selectedProduct?.unit}`,
              previewDetails: [`${new Set(point.rows.map(row=>row.branchId)).size}/${count} outlets ${measure==="closing"?"with known balance":"recorded"}`, ...(measure==="closing"?[`${point.updated} updated that day`]:[])],
            }))} />}
        </div>
        {!periodPending ? <p className="mt-3 text-xs text-muted-foreground">{points.filter((point) => point.value !== null).length}/{days} days {measure==="closing"?"with full balance coverage":"recorded"}{points.some(point=>point.value!==null)?" · select a day for details":""}</p> : null}

        <section className="mt-4 border-t pt-3" aria-label="Selected packaging outlet counts">
          <h3 className="text-sm font-semibold">Last count by outlet</h3>
          <div className="divide-y">{report.outlets.filter(branch=>outlet==="all"||branch.id===outlet).map(branch=>{
            const balance=balances.find(row=>row.branchId===branch.id);
            return <div key={branch.id} className="flex items-center justify-between gap-3 py-2 text-xs"><div className="min-w-0"><p className="break-words font-medium">{branch.name}</p><p className="text-muted-foreground">{balance?formatDateOnly(balance.date):"Not counted"}</p></div><span className="shrink-0 tabular-nums">{balance?`${formatNumber(balance.closing)} ${selectedProduct?.unit}`:"—"}</span></div>;
          })}</div>
        </section>
      </div>
    </section>
    </div>
  </div>
  </WorkspaceGrid>;
}
