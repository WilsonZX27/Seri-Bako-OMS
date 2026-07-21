import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectControl } from "@/components/ui/select-control";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StockBalanceTableRows } from "@/components/stock-balance-table";
import { OperationalList, OperationalListRow, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getBranchesForSelect } from "@/server/queries/common";
import { getStockBalanceDetails } from "@/server/queries/inventory";

function statusVariant(status: string) {
  if (status === "negative") return "danger";
  if (status === "low_stock") return "warning";
  return "success";
}

export default async function StockBalancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [branches, balances] = await Promise.all([
    getBranchesForSelect(),
    getStockBalanceDetails({ ...filters, view: "branch" }),
  ]);
  const totalValue = balances.rows.reduce((sum, item) => sum + item.inventory_value, 0);
  const lowStock = balances.rows.filter((item) => item.status === "low_stock").length;
  const negative = balances.rows.filter((item) => item.status === "negative").length;
  const filtered = hasActiveFilters(filters);
  return (
    <>
      <PageHeader title="Stock Balance" description="Calculated from posted Movement Ledger transactions. No direct balance edits." />
      <WorkspaceGrid
        rightRail={
          <>
            <ConsoleSection title="Actions"><Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/stock-transactions">Open Movement Ledger</Link></Button></ConsoleSection>
            <ConsoleSection title="Stock Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Rows Shown</span><strong>{balances.rows.length}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Low Stock</span><strong>{lowStock}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Negative</span><strong>{negative}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Scope</span><strong>Branch</strong></div>
              </div>
              <div className="my-3 border-t" />
              <div className="flex justify-between gap-3 text-xs">
                <span className="text-muted-foreground">Inventory Value</span>
                <strong>{formatCurrency(totalValue)}</strong>
              </div>
            </ConsoleSection>
          </>
        }
      >
        <div className="overflow-hidden rounded-[2px] border border-[var(--sb-border-soft)] bg-card">
          <FilterBar resultCount={balances.totalRows} resetHref="/stock-balance" filtered={filtered}>
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search item, branch, status" className="md:max-w-sm" />
            <SelectControl name="branch_id" defaultValue={filters.branch_id ?? "all"} ariaLabel="Branch" className="md:max-w-xs" options={[{ value: "all", label: "All branches" }, ...branches.map((branch) => ({ value: branch.id, label: branch.branch_name }))]} />
            <SelectControl
              name="status"
              defaultValue={filters.status ?? "all"}
              ariaLabel="Status"
              className="md:max-w-44"
              options={[
                { value: "all", label: "All statuses" },
                { value: "ok", label: "OK" },
                { value: "low_stock", label: "Need to Order" },
                { value: "negative", label: "Out of Stock" },
              ]}
            />
            <input type="hidden" name="view" value="branch" />
            <Button type="submit" variant="secondary">Search</Button>
          </FilterBar>
          <Table mobileHidden aria-label="Stock balances">
            <TableHeader>
              <TableRow>
                <SortableHead label="Item Code" column="item_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Item Name" column="item_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Last Movement</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <StockBalanceTableRows rows={balances.rows} />
            {!balances.rows.length ? (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={10}>
                    <EmptyState title={filtered ? "No balances match these filters" : "No stock balances yet"} description={filtered ? "Reset the filters or widen the search." : "Balances appear after posted stock movements."} />
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : null}
          </Table>
          <OperationalList ariaLabel="Stock balances">
            {balances.rows.map((item) => {
              const ledgerParams = new URLSearchParams({
                item_id: item.item_id,
                ...(item.branch_id ? { branch_id: item.branch_id } : {}),
              });
              return (
                <OperationalListRow
                  key={`${item.item_id}-${item.branch_id}`}
                  href={`/stock-transactions?${ledgerParams.toString()}`}
                  label={`Open ledger for ${item.item_name}`}
                  primary={item.item_name}
                  status={<Badge variant={statusVariant(item.status)}>{item.status.replaceAll("_", " ")}</Badge>}
                  secondary={`${item.item_code} Â· ${item.branch_name ?? "All permitted branches"}`}
                  meta={`${formatNumber(item.current_qty)} ${item.base_unit}`}
                />
              );
            })}
            {!balances.rows.length ? <EmptyState title={filtered ? "No balances match these filters" : "No stock balances yet"} description={filtered ? "Reset the filters or widen the search." : "Balances appear after posted stock movements."} action={filtered ? { href: "/stock-balance", label: "Reset filters" } : undefined} /> : null}
          </OperationalList>
          <PaginationControls page={balances.page} totalPages={balances.totalPages} totalRows={balances.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
