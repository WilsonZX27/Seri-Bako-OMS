import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getStockBalanceDetails } from "@/server/queries/inventory";

function statusVariant(status: string) {
  if (status === "negative") return "danger";
  if (status === "low_stock") return "warning";
  return "success";
}

export default async function StockBalancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const isLocationView = filters.view === "location";
  const balances = await getStockBalanceDetails(filters);
  const totalValue = balances.rows.reduce((sum, item) => sum + item.inventory_value, 0);
  const lowStock = balances.rows.filter((item) => item.status === "low_stock").length;
  const negative = balances.rows.filter((item) => item.status === "negative").length;
  return (
    <>
      <PageHeader title="Stock Balance" description="Calculated from posted Movement Ledger transactions. No direct balance edits." />
      <WorkspaceGrid
        rightRail={
          <>
            <ConsoleSection title="Stock Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Rows Shown</span><strong>{balances.rows.length}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Low Stock</span><strong>{lowStock}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Negative</span><strong>{negative}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">View</span><strong>{isLocationView ? "Location" : "Branch"}</strong></div>
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
          <form className="sb-list-filters">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search item, location, status" className="md:max-w-sm" />
            <input type="hidden" name="view" value={filters.view ?? "branch"} />
            <Button type="submit" variant="secondary">Search</Button>
            <Button asChild variant={isLocationView ? "ghost" : "outline"}><a href="?view=branch">Branch view</a></Button>
            <Button asChild variant={isLocationView ? "outline" : "ghost"}><a href="?view=location">Location detail</a></Button>
            <Button asChild variant="ghost"><a href="?view=branch">Reset</a></Button>
          </form>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <SortableHead label="Item Code" column="item_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Item Name" column="item_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Branch</TableHead>
                  <TableHead>{isLocationView ? "Location" : "Scope"}</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Last Movement</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.rows.map((item) => (
                  <TableRow key={`${item.item_id}-${item.location_id}`}>
                    <TableCell><div className="flex h-10 w-10 items-center justify-center rounded-md border bg-secondary text-[10px] text-muted-foreground">IMG</div></TableCell>
                    <TableCell>{item.item_code}</TableCell>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell>{item.branch_name ?? "-"}</TableCell>
                    <TableCell>{item.location_name}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.available_qty)} {item.base_unit}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.reserved_qty)} {item.base_unit}</TableCell>
                    <TableCell className="text-right font-medium">{formatNumber(item.current_qty)} {item.base_unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.average_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.inventory_value)}</TableCell>
                    <TableCell>{item.last_movement ?? "-"}</TableCell>
                    <TableCell><Badge variant={statusVariant(item.status)}>{item.status.replaceAll("_", " ")}</Badge></TableCell>
                  </TableRow>
                ))}
                {!balances.rows.length ? (
                  <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">No stock balance rows found.</TableCell></TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <PaginationControls page={balances.page} totalPages={balances.totalPages} totalRows={balances.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
