import Link from "next/link";
import { Download, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterBarMore } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getBranchesForSelect, getItemsForSelect } from "@/server/queries/common";
import { hasPermission } from "@/server/auth/permissions";
import { getStockBalanceDetails, getStockLedger } from "@/server/queries/inventory";
import type { StockTransactionType } from "@/types/database";

const transactionTypes: { value: StockTransactionType; label: string }[] = [
  { value: "opening_balance", label: "Opening balance" },
  { value: "purchase", label: "Purchase receipt" },
  { value: "production_usage", label: "Production usage" },
  { value: "production_output", label: "Production output" },
  { value: "transfer_out", label: "Transfer out" },
  { value: "transfer_in", label: "Transfer in" },
  { value: "stock_count_adjustment", label: "Stock count adjustment" },
  { value: "return_to_supplier", label: "Return to supplier" },
  { value: "return_supplier", label: "Return to supplier" },
  { value: "wastage", label: "Wastage / write-off" },
  { value: "damage", label: "Damage" },
  { value: "missing", label: "Missing" },
  { value: "correction", label: "Correction" },
];

function movementLabel(type: string) {
  return transactionTypes.find((row) => row.value === type)?.label ?? type.replaceAll("_", " ");
}

function exportHref(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `/stock-transactions/export?${params.toString()}`;
}

export default async function StockTransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [ledger, balances, branches, items, canExport, canCreate] = await Promise.all([
    getStockLedger(filters),
    getStockBalanceDetails({ ...filters, page: "all" }),
    getBranchesForSelect(),
    getItemsForSelect(),
    hasPermission("stock_ledger.export"),
    hasPermission("stock_transactions.create"),
  ]);
  const value = balances.rows.reduce((sum, item) => sum + Number(item.inventory_value), 0);
  const inbound = ledger.rows.reduce((sum, row) => sum + Number(row.quantity_in), 0);
  const outbound = ledger.rows.reduce((sum, row) => sum + Number(row.quantity_out), 0);
  const filtered = hasActiveFilters(filters);

  return (
    <>
      <PageHeader
        title="Movement Ledger"
        description="Append-only inventory movement and valuation audit by branch and item."
      />
      <WorkspaceGrid
        rightRail={
          <>
            {canCreate || canExport ? <ConsoleSection title="Actions">
              <div className="grid gap-2">
                {canCreate ? <Button asChild size="sm" className="w-full" data-mobile-primary-action>
                  <Link href="/stock-transactions/new">New movement</Link>
                </Button> : null}
                {canExport ? (
                  <Button asChild variant="outline" size="sm" className="w-full" data-mobile-primary-action={!canCreate || undefined}>
                    <Link href={exportHref(filters)}><Download className="h-4 w-4" /> CSV</Link>
                  </Button>
                ) : null}
              </div>
            </ConsoleSection> : null}
            <ConsoleSection title="Valuation">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Ledger rows</span><strong>{ledger.totalRows}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Quantity in</span><strong>{formatNumber(inbound)}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Quantity out</span><strong>{formatNumber(outbound)}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Stock rows</span><strong>{balances.totalRows}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Stock value</span><strong>{formatCurrency(value)}</strong></div>
              </div>
            </ConsoleSection>
          </>
        }
      >
        <div className="overflow-hidden rounded-[2px] border border-[var(--sb-border-soft)] bg-card">
          <FilterBar resultCount={ledger.totalRows} resetHref="/stock-transactions" filtered={filtered}>
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Item or transaction" />
            <SelectNative name="branch_id" defaultValue={filters.branch_id ?? "all"}>
              <option value="all">All branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
            </SelectNative>
            <FilterBarMore activeCount={[filters.item_id && filters.item_id !== "all", filters.type && filters.type !== "all", filters.direction && filters.direction !== "all", filters.source, filters.from, filters.to].filter(Boolean).length} resetHref="/stock-transactions"><SelectNative name="item_id" defaultValue={filters.item_id ?? "all"}>
              <option value="all">All items</option>
              {items.map((item) => <option key={item.id} value={item.id}>{item.item_code}</option>)}
            </SelectNative>
            <SelectNative name="type" defaultValue={filters.type ?? "all"}>
              <option value="all">All types</option>
              {transactionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </SelectNative>
            <SelectNative name="direction" defaultValue={filters.direction ?? "all"}>
              <option value="all">In and out</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </SelectNative>
            <Input name="source" defaultValue={filters.source ?? ""} placeholder="Source/reference" />
            <Input name="from" type="date" defaultValue={filters.from ?? ""} />
            <Input name="to" type="date" defaultValue={filters.to ?? ""} />
            </FilterBarMore>
            <Button type="submit" variant="secondary">Filter</Button>
          </FilterBar>
            <Table mobileHidden aria-label="Stock movement ledger">
              <TableHeader>
                <TableRow>
                  <SortableHead label="Date/time" column="transaction_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Transaction No" column="transaction_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Type" column="transaction_type" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Item</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">In</TableHead>
                  <TableHead className="text-right">Out</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="w-16 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.rows.map((row) => (
                  <DataGridRow key={row.stock_transaction_id} href={`/stock-transactions/${row.stock_transaction_id}`}>
                    <TableCell>{row.transaction_date}</TableCell>
                    <TableCell className="font-medium">{row.transaction_no}</TableCell>
                    <TableCell><Badge variant="secondary">{movementLabel(row.transaction_type)}</Badge></TableCell>
                    <TableCell className="font-medium">{row.item_code}<p className="text-xs text-muted-foreground">{row.item_name}</p></TableCell>
                    <TableCell>{row.branch_name ?? row.location_name}</TableCell>
                    <TableCell className="text-right">{row.quantity_in ? formatNumber(row.quantity_in) : "-"}</TableCell>
                    <TableCell className="text-right">{row.quantity_out ? formatNumber(row.quantity_out) : "-"}</TableCell>
                    <TableCell className="text-right">{formatNumber(Number(row.quantity_in) - Number(row.quantity_out))}</TableCell>
                    <TableCell>{row.base_unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.unit_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_cost)}</TableCell>
                    <TableCell className="text-right">
                      <TableActionLink href={`/stock-transactions/${row.stock_transaction_id}`} label={`Open ${row.transaction_no}`}><Pencil className="h-4 w-4" /></TableActionLink>
                    </TableCell>
                  </DataGridRow>
                ))}
                {!ledger.rows.length ? (
                  <TableRow>
                    <TableCell colSpan={12}>
                      <EmptyState title={filtered ? "No movements match these filters" : "No ledger movements yet"} description={filtered ? "Reset the filters or widen the date range." : "Posted inventory movements will appear here."} action={filtered ? { href: "/stock-transactions", label: "Reset filters" } : undefined} />
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            <OperationalList ariaLabel="Stock movement ledger">
              {ledger.rows.map((row) => <OperationalListRow key={row.stock_transaction_id} href={`/stock-transactions/${row.stock_transaction_id}`} label={`Open ${row.transaction_no}`} primary={row.item_name} status={<Badge variant="secondary">{movementLabel(row.transaction_type)}</Badge>} secondary={`${row.item_code} · ${row.transaction_no}`} meta={`${row.quantity_in ? "+" : "−"}${formatNumber(row.quantity_in || row.quantity_out)} ${row.base_unit}`} />)}
              {!ledger.rows.length ? <EmptyState title={filtered ? "No movements match these filters" : "No ledger movements yet"} description={filtered ? "Reset the filters or widen the date range." : "Posted inventory movements will appear here."} action={filtered ? { href: "/stock-transactions", label: "Reset filters" } : undefined} /> : null}
            </OperationalList>
          <PaginationControls page={ledger.page} totalPages={ledger.totalPages} totalRows={ledger.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
