import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import { getOutletPackagingReport } from "@/server/queries/outlet-packaging";
import { saveOutletPackagingLink } from "@/server/actions/outlet-packaging";

export default async function OutletPackagingPage({ searchParams }: { searchParams: Promise<{ days?: string; error?: string; success?: string }> }) {
  const { days: rawDays, error, success } = await searchParams;
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
  const linkByProduct = new Map(report.links.map((link) => [link.productId, link]));
  const stockByItem = new Map<string, number>();
  const stockLocations = new Set<string>();
  for (const row of report.warehouse.filter((entry) => !entry.isOutlet)) {
    stockByItem.set(row.itemId, (stockByItem.get(row.itemId) ?? 0) + row.quantity);
    stockLocations.add(row.itemId);
  }
  const dailyByCode = new Map<string, Map<string, (typeof report.rows)[number]>>();
  for (const row of report.rows.filter((entry) => entry.date === report.today && entry.closing !== null)) {
    const outletMap = dailyByCode.get(row.code) ?? new Map();
    outletMap.set(row.branchId, row);
    dailyByCode.set(row.code, outletMap);
  }

  return <>
    <PageHeader title="Packaging Usage" description="Daily outlet consumption and the latest recorded closing counts." contentWidth="wide" />
    <WorkspaceGrid tabletCanvas="wide" hideMobileConsole rightRail={<a href="#packaging-mapping-title" className="block rounded-[var(--sb-radius-control)] border bg-card px-3 py-3 text-sm font-medium underline underline-offset-2">Manage SKU mapping</a>}>
      <div className="space-y-4">
        {error ? <p role="alert" className="rounded-[var(--sb-radius-control)] border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p> : null}
        {success ? <p role="status" className="rounded-[var(--sb-radius-control)] border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900">{success}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--sb-panel-radius)] border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">Outlet staff record usage in <Link className="font-medium text-foreground underline underline-offset-2" href="/outlet-daily-records">Daily Records</Link>.</p>
          <div className="flex gap-1 rounded-[var(--sb-radius-control)] border p-1 text-sm" aria-label="Report period">
            {[7, 30].map((period) => <Link key={period} href={`/outlet-packaging?days=${period}`} aria-current={days === period ? "page" : undefined} className={`rounded-[var(--sb-radius-control)] px-3 py-2 ${days === period ? "bg-[var(--sb-green-900)] text-white" : "hover:bg-muted"}`}>{period} days</Link>)}
          </div>
        </div>
        {report.truncated ? <p className="rounded-[var(--sb-radius-control)] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">This period contains more than 1,000 daily records. Choose 7 days for a complete view.</p> : null}
        {report.warehouseTruncated ? <p className="rounded-[var(--sb-radius-control)] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">Inventory contains more than 500 packaging balances. Combined totals are withheld until the full ledger can be read.</p> : null}
        <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card" aria-labelledby="packaging-reconciliation-title">
          <div className="border-b px-4 py-3"><h2 id="packaging-reconciliation-title" className="font-semibold">Company balance reconciliation</h2><p className="text-xs text-muted-foreground">Warehouse ledger balance plus today&apos;s completed outlet closing balances, converted to the inventory item&apos;s base unit. A calculated total appears only when every active outlet has a recorded balance. Daily Record balances may be calculated from received minus usage; verify physical stock through a separate stock count.</p></div>
          <Table aria-label="Packaging balance reconciliation"><TableHeader><TableRow><TableHead>Packaging</TableHead><TableHead>Warehouse</TableHead><TableHead>Outlets counted today</TableHead><TableHead className="text-right">Calculated total</TableHead></TableRow></TableHeader><TableBody>{report.products.map((product) => {
            const link = linkByProduct.get(product.id);
            const item = report.items.find((entry) => entry.id === link?.itemId);
            const warehouse = link && stockLocations.has(link.itemId) ? stockByItem.get(link.itemId) ?? null : null;
            const outletRows = dailyByCode.get(product.code);
            const counted = outletRows?.size ?? 0;
            const complete = Boolean(link && item && warehouse !== null && report.activeOutletCount > 0 && counted === report.activeOutletCount && !report.truncated && !report.warehouseTruncated);
            const total = complete && link ? (warehouse ?? 0) + [...(outletRows?.values() ?? [])].reduce((sum, row) => sum + (row.closing ?? 0) * link.factor, 0) : null;
            return <TableRow key={product.id}><TableCell><strong>{product.name}</strong><span className="block text-xs text-muted-foreground">{product.code}{item ? ` → ${item.code} · 1 ${product.unit} = ${formatNumber(link?.factor ?? 0)} ${item.unit}` : " · SKU mapping needed"}</span></TableCell><TableCell className="tabular-nums">{warehouse === null ? "Unavailable" : `${formatNumber(warehouse)} ${item?.unit ?? ""}`}</TableCell><TableCell className="tabular-nums">{counted}/{report.activeOutletCount}</TableCell><TableCell className="text-right font-semibold tabular-nums">{total === null ? "Incomplete" : `${formatNumber(total)} ${item?.unit ?? ""}`}</TableCell></TableRow>;
          })}</TableBody></Table>
          {!report.products.length ? <EmptyState title="No packaging products" description="Create packaging products before configuring reconciliation." /> : null}
        </section>
        <section className="rounded-[var(--sb-panel-radius)] border bg-card" aria-labelledby="packaging-mapping-title">
          <div className="border-b px-4 py-3"><h2 id="packaging-mapping-title" className="font-semibold">SKU mapping</h2><p className="text-xs text-muted-foreground">Choose the inventory item for each Daily Record product and set the base-unit conversion. One inventory item can link to one product.</p></div>
          {!report.mappingReady ? <p className="px-4 py-3 text-sm text-muted-foreground">SKU mapping is waiting for database migration 318. Usage reports remain available.</p> : <div className="divide-y">{report.products.map((product) => {
            const link = linkByProduct.get(product.id);
            return <form key={product.id} action={saveOutletPackagingLink} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1.5fr)_minmax(9rem,1fr)_auto] md:items-end">
              <input type="hidden" name="product_id" value={product.id} />
              <div className="min-w-0"><strong className="block text-sm">{product.name}</strong><span className="text-xs text-muted-foreground">{product.code} · {product.unit}</span></div>
              <label className="grid gap-1 text-xs font-medium">Inventory SKU<SelectNative name="item_id" defaultValue={link?.itemId ?? ""}><option value="">Unlinked</option>{report.items.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name} ({item.unit})</option>)}</SelectNative></label>
              <label className="grid gap-1 text-xs font-medium">Base units per {product.unit}<input name="factor" type="number" min="0.000001" max="1000000" step="0.000001" required defaultValue={link?.factor ?? 1} className="h-[var(--sb-control-height)] w-full rounded-[var(--sb-radius-control)] border px-3 text-sm" /></label>
              <Button type="submit" size="sm">Save mapping</Button>
            </form>;
          })}</div>}
        </section>
        <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card" aria-labelledby="packaging-summary-title">
          <div className="border-b px-4 py-3"><h2 id="packaging-summary-title" className="font-semibold">Usage by packaging item</h2><p className="text-xs text-muted-foreground">Recorded consumption across outlets in the selected period.</p></div>
          <Table aria-label="Packaging usage totals"><TableHeader><TableRow><TableHead>Packaging</TableHead><TableHead>Outlets</TableHead><TableHead className="text-right">Used</TableHead></TableRow></TableHeader><TableBody>{[...totals.entries()].map(([code, total]) => <TableRow key={code}><TableCell><strong>{total.name}</strong><span className="block text-xs text-muted-foreground">{code}</span></TableCell><TableCell>{total.locations.size}</TableCell><TableCell className="text-right tabular-nums">{formatNumber(total.usage)} {total.unit}</TableCell></TableRow>)}</TableBody></Table>
          {!totals.size ? <EmptyState title="No packaging usage recorded" description="Packaging lines entered in Outlet Daily Records will appear here." /> : null}
        </section>
        <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card" aria-labelledby="packaging-outlet-title">
          <div className="border-b px-4 py-3"><h2 id="packaging-outlet-title" className="font-semibold">Latest outlet closing balances</h2><p className="text-xs text-muted-foreground">Latest completed daily record per outlet and packaging item. Balances may be calculated or entered by staff; these are not verified physical counts.</p></div>
          <Table aria-label="Latest outlet packaging balances"><TableHeader><TableRow><TableHead>Outlet</TableHead><TableHead>Packaging</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Closing count</TableHead></TableRow></TableHeader><TableBody>{[...latest.values()].map((row) => <TableRow key={row.id}><TableCell>{row.branch}</TableCell><TableCell>{row.product}<span className="block text-xs text-muted-foreground">{row.code}</span></TableCell><TableCell>{formatDateOnly(row.date)}</TableCell><TableCell className="text-right tabular-nums">{formatNumber(row.closing ?? 0)} {row.unit}</TableCell></TableRow>)}</TableBody></Table>
          {!latest.size ? <EmptyState title="No completed closing count" description="Complete an outlet daily record with packaging balances to establish a count." /> : null}
        </section>
        <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card" aria-labelledby="packaging-history-title">
          <div className="border-b px-4 py-3"><h2 id="packaging-history-title" className="font-semibold">Daily usage by outlet</h2></div>
          <Table aria-label="Daily packaging usage by outlet"><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Outlet</TableHead><TableHead>Packaging</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Used</TableHead><TableHead className="text-right">Closing</TableHead></TableRow></TableHeader><TableBody>{report.rows.map((row) => <TableRow key={row.id}><TableCell>{formatDateOnly(row.date)}</TableCell><TableCell>{row.branch}</TableCell><TableCell>{row.product}</TableCell><TableCell className="text-right tabular-nums">{row.received === null ? "—" : formatNumber(row.received)}</TableCell><TableCell className="text-right tabular-nums">{formatNumber(row.usage)}</TableCell><TableCell className="text-right tabular-nums">{row.closing === null ? "Pending" : formatNumber(row.closing)}</TableCell></TableRow>)}</TableBody></Table>
          {!report.rows.length ? <EmptyState title="No daily usage in this period" description="Choose 30 days or start recording packaging usage in Daily Records." /> : null}
        </section>
        <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card" aria-labelledby="packaging-warehouse-title">
          <div className="border-b px-4 py-3"><h2 id="packaging-warehouse-title" className="font-semibold">Inventory ledger</h2><p className="text-xs text-muted-foreground">Packaging stock by location. Outlet ledger rows are shown for review but excluded from the combined figure to avoid double counting Daily Record closing counts.</p></div>
          <Table aria-label="Packaging inventory balances"><TableHeader><TableRow><TableHead>Location</TableHead><TableHead>Inventory item</TableHead><TableHead className="text-right">Current stock</TableHead></TableRow></TableHeader><TableBody>{report.warehouse.map((row) => <TableRow key={row.id}><TableCell>{row.branch}</TableCell><TableCell>{row.name}</TableCell><TableCell className="text-right tabular-nums">{formatNumber(row.quantity)} {row.unit}</TableCell></TableRow>)}</TableBody></Table>
          {!report.warehouse.length ? <EmptyState title="No packaging inventory balances available" description="Packaging stock appears here when its item and movements are maintained in Inventory." /> : null}
        </section>
      </div>
    </WorkspaceGrid>
  </>;
}
