import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterBarMore } from "@/components/ui/filter-bar";
import { UnifiedListHeader } from "@/components/common/UnifiedListHeader";
import { Input } from "@/components/ui/input";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { PageHeader } from "@/components/ui/page-header";
import { SelectControl } from "@/components/ui/select-control";
import { OperationalList, OperationalListRow, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateOnly, formatNumber, getToday } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getBranchesForSelect, getItemsForSelect } from "@/server/queries/common";
import { getStockCard } from "@/server/queries/inventory";

export default async function StockCardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const today = getToday();
  const effectiveFilters = { ...filters, from: filters.from ?? today, to: filters.to ?? today };
  const [items, branches, rows] = await Promise.all([getItemsForSelect(), getBranchesForSelect({ restrictToActorScope: true }), getStockCard(effectiveFilters)]);
  const selectedItem = filters.item_id ? items.find((item) => item.id === filters.item_id) : null;
  const opening = rows.filter((row) => row.transaction_type === "opening_balance").reduce((sum, row) => sum + row.quantity_in - row.quantity_out, 0);
  const purchase = rows.filter((row) => row.transaction_type === "purchase").reduce((sum, row) => sum + row.quantity_in, 0);
  const transferIn = rows.filter((row) => row.transaction_type === "transfer_in").reduce((sum, row) => sum + row.quantity_in, 0);
  const productionOutput = rows.filter((row) => row.transaction_type === "production_output").reduce((sum, row) => sum + row.quantity_in, 0);
  const productionUsage = rows.filter((row) => row.transaction_type === "production_usage").reduce((sum, row) => sum + row.quantity_out, 0);
  const transferOut = rows.filter((row) => row.transaction_type === "transfer_out").reduce((sum, row) => sum + row.quantity_out, 0);
  const wastage = rows.filter((row) => ["wastage", "damage"].includes(row.transaction_type)).reduce((sum, row) => sum + row.quantity_out, 0);
  const adjustment = rows.filter((row) => ["stock_adjustment", "stock_count_adjustment", "correction"].includes(row.transaction_type)).reduce((sum, row) => sum + row.quantity_in - row.quantity_out, 0);
  const current = rows.reduce((sum, row) => sum + row.quantity_in - row.quantity_out, 0);
  const filtered = hasActiveFilters(filters);
  const movementSummary = [
    ["Opening", opening],
    ["Purchase", purchase],
    ["Transfer In", transferIn],
    ["Production Output", productionOutput],
    ["Production Usage", -productionUsage],
    ["Transfer Out", -transferOut],
    ["Wastage", -wastage],
    ["Adjustment", adjustment],
  ] as const;

  return (
    <>
      <PageHeader title="Stock Card" description="Chronological stock movement history per item." />
      <WorkspaceGrid className="p-3 sm:p-4">
        <div className="space-y-3">
          <section className="sb-list-filters--stock-card overflow-hidden rounded-[2px] border bg-card" aria-label="Stock card filters">
            <div className="hidden sm:block">
              <FilterBar resultCount={rows.length} resetHref="/stock-card" filtered={filtered}>
                <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search item, transaction, or branch" aria-label="Search stock movements" />
                <SelectControl name="item_id" defaultValue={filters.item_id ?? "all"} ariaLabel="Item" options={[{ value: "all", label: "All items" }, ...items.map((item) => ({ value: item.id, label: `${item.item_code} — ${item.item_name}` }))]} />
                <SelectControl name="branch_id" defaultValue={filters.branch_id ?? "all"} ariaLabel="Branch" options={[{ value: "all", label: "All branches" }, ...branches.map((branch) => ({ value: branch.id, label: branch.branch_name }))]} />
                <FilterBarMore activeCount={Number(Boolean(filters.type && filters.type !== "all")) + Number(Boolean(filters.from)) + Number(Boolean(filters.to))} resetHref="/stock-card">
                  <SelectControl name="type" defaultValue={filters.type ?? "all"} ariaLabel="Movement type" options={[{ value: "all", label: "All movement types" }, ...["opening_balance", "purchase", "transfer_in", "transfer_out", "production_output", "production_usage", "wastage", "damage", "stock_adjustment", "stock_count_adjustment", "correction"].map((type) => ({ value: type, label: type.replaceAll("_", " ") }))]} />
                  <label className="grid gap-1 text-xs">From date<Input name="from" type="date" defaultValue={effectiveFilters.from} aria-label="From date" /></label>
                  <label className="grid gap-1 text-xs">To date<Input name="to" type="date" defaultValue={effectiveFilters.to} aria-label="To date" /></label>
                </FilterBarMore>
                {filtered ? <Button asChild variant="secondary" className="sb-filter-submit"><Link href="/stock-card">Reset</Link></Button> : <Button type="submit" variant="secondary" className="sb-filter-submit">Apply</Button>}
              </FilterBar>
            </div>
            <div className="sm:hidden">
              <UnifiedListHeader phoneOnly resultCount={rows.length} resetHref="/stock-card" filtered={filtered} activeCount={Number(Boolean(filters.item_id && filters.item_id !== "all")) + Number(Boolean(filters.branch_id && filters.branch_id !== "all")) + Number(Boolean(filters.type && filters.type !== "all")) + Number(Boolean(filters.from)) + Number(Boolean(filters.to))}>
                <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search item, transaction, or branch" aria-label="Search stock movements" />
                <SelectControl name="item_id" defaultValue={filters.item_id ?? "all"} ariaLabel="Item" options={[{ value: "all", label: "All items" }, ...items.map((item) => ({ value: item.id, label: `${item.item_code} — ${item.item_name}` }))]} />
                <SelectControl name="branch_id" defaultValue={filters.branch_id ?? "all"} ariaLabel="Branch" options={[{ value: "all", label: "All branches" }, ...branches.map((branch) => ({ value: branch.id, label: branch.branch_name }))]} />
                <FilterBarMore activeCount={Number(Boolean(filters.type && filters.type !== "all")) + Number(Boolean(filters.from)) + Number(Boolean(filters.to))} resetHref="/stock-card">
                  <SelectControl name="type" defaultValue={filters.type ?? "all"} ariaLabel="Movement type" options={[{ value: "all", label: "All movement types" }, ...["opening_balance", "purchase", "transfer_in", "transfer_out", "production_output", "production_usage", "wastage", "damage", "stock_adjustment", "stock_count_adjustment", "correction"].map((type) => ({ value: type, label: type.replaceAll("_", " ") }))]} />
                  <label className="grid gap-1 text-xs">From date<Input name="from" type="date" defaultValue={effectiveFilters.from} aria-label="From date" /></label>
                  <label className="grid gap-1 text-xs">To date<Input name="to" type="date" defaultValue={effectiveFilters.to} aria-label="To date" /></label>
                </FilterBarMore>
              </UnifiedListHeader>
            </div>
          </section>

          <section className="overflow-hidden rounded-[2px] border bg-card" aria-labelledby="stock-card-summary">
            <div className="border-b px-3 py-2.5"><h2 id="stock-card-summary" className="text-xs font-semibold">Movement summary</h2></div>
            <div className="grid grid-cols-4 overflow-hidden xl:grid-cols-8">
              {movementSummary.map(([label, value]) => (
                <div key={label} className="min-w-0 border-b border-r px-2 py-2 sm:px-3">
                  <p className="line-clamp-2 min-h-7 text-[10px] leading-3.5 text-muted-foreground sm:min-h-0 sm:truncate sm:text-[11px]">{label}</p>
                  <p className="mt-0.5 truncate font-mono text-xs font-semibold tabular-nums sm:text-sm">{formatNumber(value)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-[2px] border bg-card">
            <div className="border-b px-3 py-2.5">
              <h2 className="text-sm font-semibold">{selectedItem ? `${selectedItem.item_code} — ${selectedItem.item_name}` : "Stock Movement History"}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Current balance: {formatNumber(current)} {selectedItem?.base_unit ?? ""}</p>
            </div>
              <Table mobileHidden stickyColumn="first" aria-label="Stock movement history">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Transaction No</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">In</TableHead>
                    <TableHead className="text-right">Out</TableHead>
                    <TableHead className="text-right">Running</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.stock_transaction_id}>
                      <TableCell className="font-medium">{row.item_name}</TableCell>
                      <TableCell>{formatDateOnly(row.transaction_date)}</TableCell>
                      <TableCell className="font-medium">{row.transaction_no}</TableCell>
                      <TableCell>{row.transaction_type.replaceAll("_", " ")}</TableCell>
                      <TableCell>{row.branch_name ?? "-"}</TableCell>
                      <TableCell className="text-right">{row.quantity_in ? formatNumber(row.quantity_in) : "-"}</TableCell>
                      <TableCell className="text-right">{row.quantity_out ? formatNumber(row.quantity_out) : "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatNumber(row.running_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.unit_cost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.total_cost)}</TableCell>
                      <TableCell>{row.reference_type ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                  {!rows.length ? <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">No stock movements found.</TableCell></TableRow> : null}
                </TableBody>
              </Table>
              <OperationalList ariaLabel="Stock movement history">
                {rows.map((row) => <OperationalListRow key={row.stock_transaction_id} href={`/stock-transactions/${row.stock_transaction_id}`} label={`Open ${row.transaction_no}`} primary={row.item_name} secondary={`${formatDateOnly(row.transaction_date)} · ${row.transaction_no} · ${row.transaction_type.replaceAll("_", " ")}`} meta={`${formatNumber(row.quantity_in - row.quantity_out)} ${row.base_unit}`} />)}
                {!rows.length ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">No stock movements found.</p> : null}
              </OperationalList>
          </section>
        </div>
      </WorkspaceGrid>
    </>
  );
}
