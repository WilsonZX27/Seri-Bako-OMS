import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import { getOutletPackagingReport } from "@/server/queries/outlet-packaging";

export default async function OutletPackagingPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: rawDays } = await searchParams;
  const days = rawDays === "30" ? 30 : 7;
  const report = await getOutletPackagingReport(days);
  const totals = new Map<string, { name: string; unit: string; usage: number; locations: Set<string> }>();
  const latest = new Map<string, (typeof report.rows)[number]>();
  for (const row of report.rows) {
    const total = totals.get(row.code) ?? { name: row.product, unit: row.unit, usage: 0, locations: new Set<string>() };
    total.usage += row.usage;
    total.locations.add(row.branch);
    totals.set(row.code, total);
    const key = `${row.branch}:${row.code}`;
    if (!latest.has(key) && row.closing !== null) latest.set(key, row);
  }

  return <>
    <PageHeader title="Packaging Usage" description="Daily outlet consumption and the latest recorded closing counts." contentWidth="wide" />
    <WorkspaceGrid tabletCanvas="wide" hideMobileConsole>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--sb-panel-radius)] border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">Outlet staff record usage in <Link className="font-medium text-foreground underline underline-offset-2" href="/outlet-daily-records">Daily Records</Link>.</p>
          <div className="flex gap-1 rounded-[var(--sb-radius-control)] border p-1 text-sm" aria-label="Report period">
            {[7, 30].map((period) => <Link key={period} href={`/outlet-packaging?days=${period}`} aria-current={days === period ? "page" : undefined} className={`rounded-[var(--sb-radius-control)] px-3 py-2 ${days === period ? "bg-[var(--sb-green-900)] text-white" : "hover:bg-muted"}`}>{period} days</Link>)}
          </div>
        </div>
        {report.truncated ? <p className="rounded-[var(--sb-radius-control)] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">This period contains more than 1,000 daily records. Choose 7 days for a complete view.</p> : null}
        <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card" aria-labelledby="packaging-summary-title">
          <div className="border-b px-4 py-3"><h2 id="packaging-summary-title" className="font-semibold">Usage by packaging item</h2><p className="text-xs text-muted-foreground">Recorded consumption across outlets in the selected period.</p></div>
          <Table aria-label="Packaging usage totals"><TableHeader><TableRow><TableHead>Packaging</TableHead><TableHead>Outlets</TableHead><TableHead className="text-right">Used</TableHead></TableRow></TableHeader><TableBody>{[...totals.entries()].map(([code, total]) => <TableRow key={code}><TableCell><strong>{total.name}</strong><span className="block text-xs text-muted-foreground">{code}</span></TableCell><TableCell>{total.locations.size}</TableCell><TableCell className="text-right tabular-nums">{formatNumber(total.usage)} {total.unit}</TableCell></TableRow>)}</TableBody></Table>
          {!totals.size ? <EmptyState title="No packaging usage recorded" description="Packaging lines entered in Outlet Daily Records will appear here." /> : null}
        </section>
        <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card" aria-labelledby="packaging-outlet-title">
          <div className="border-b px-4 py-3"><h2 id="packaging-outlet-title" className="font-semibold">Latest outlet closing counts</h2><p className="text-xs text-muted-foreground">Latest completed daily record per outlet and packaging item. These are recorded counts, not a live stock ledger.</p></div>
          <Table aria-label="Latest outlet packaging balances"><TableHeader><TableRow><TableHead>Outlet</TableHead><TableHead>Packaging</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Closing count</TableHead></TableRow></TableHeader><TableBody>{[...latest.values()].map((row) => <TableRow key={row.id}><TableCell>{row.branch}</TableCell><TableCell>{row.product}<span className="block text-xs text-muted-foreground">{row.code}</span></TableCell><TableCell>{formatDateOnly(row.date)}</TableCell><TableCell className="text-right tabular-nums">{formatNumber(row.closing ?? 0)} {row.unit}</TableCell></TableRow>)}</TableBody></Table>
          {!latest.size ? <EmptyState title="No completed closing count" description="Complete an outlet daily record with packaging balances to establish a count." /> : null}
        </section>
        <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card" aria-labelledby="packaging-history-title">
          <div className="border-b px-4 py-3"><h2 id="packaging-history-title" className="font-semibold">Daily usage by outlet</h2></div>
          <Table aria-label="Daily packaging usage by outlet"><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Outlet</TableHead><TableHead>Packaging</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Used</TableHead><TableHead className="text-right">Closing</TableHead></TableRow></TableHeader><TableBody>{report.rows.map((row) => <TableRow key={row.id}><TableCell>{formatDateOnly(row.date)}</TableCell><TableCell>{row.branch}</TableCell><TableCell>{row.product}</TableCell><TableCell className="text-right tabular-nums">{row.received === null ? "—" : formatNumber(row.received)}</TableCell><TableCell className="text-right tabular-nums">{formatNumber(row.usage)}</TableCell><TableCell className="text-right tabular-nums">{row.closing === null ? "Pending" : formatNumber(row.closing)}</TableCell></TableRow>)}</TableBody></Table>
          {!report.rows.length ? <EmptyState title="No daily usage in this period" description="Choose 30 days or start recording packaging usage in Daily Records." /> : null}
        </section>
        <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card" aria-labelledby="packaging-warehouse-title">
          <div className="border-b px-4 py-3"><h2 id="packaging-warehouse-title" className="font-semibold">Warehouse and inventory ledger</h2><p className="text-xs text-muted-foreground">Packaging items recorded in the stock ledger. Product codes in Daily Records are not yet linked to inventory item codes, so a combined company balance cannot be verified.</p></div>
          <Table aria-label="Packaging inventory balances"><TableHeader><TableRow><TableHead>Location</TableHead><TableHead>Inventory item</TableHead><TableHead className="text-right">Current stock</TableHead></TableRow></TableHeader><TableBody>{report.warehouse.map((row) => <TableRow key={row.id}><TableCell>{row.branch}</TableCell><TableCell>{row.name}</TableCell><TableCell className="text-right tabular-nums">{formatNumber(row.quantity)} {row.unit}</TableCell></TableRow>)}</TableBody></Table>
          {!report.warehouse.length ? <EmptyState title="No packaging inventory balances available" description="Packaging stock appears here when its item and movements are maintained in Inventory." /> : null}
        </section>
      </div>
    </WorkspaceGrid>
  </>;
}
