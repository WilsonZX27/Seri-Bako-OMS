import Link from "next/link";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getStockTransactions } from "@/server/queries/inventory";

function statusVariant(status: string) {
  if (status === "posted") return "success";
  if (status === "cancelled") return "danger";
  return "secondary";
}

export default async function StockTransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const transactions = await getStockTransactions(filters);

  return (
    <>
      <PageHeader
        title="Stock Transactions"
        description="Append-only inventory ledger. Corrections are posted as new movements."
        action={{ href: "/stock-transactions/new", label: "New movement" }}
      />
      <div className="p-5">
        <div className="overflow-hidden rounded-lg border bg-card">
          <form className="flex flex-col gap-3 border-b p-4 md:flex-row">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search transaction no, type, reference, remarks" className="md:max-w-sm" />
            <Button type="submit" variant="secondary">Search</Button>
            <Button asChild variant="ghost"><a href="?">Reset</a></Button>
          </form>
          <DataGridHint text="Pro-tip: Double-click any row to open the stock transaction." />
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <SortableHead label="Transaction No" column="transaction_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Date" column="transaction_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <TableHead>Item</TableHead>
                <TableHead>Location</TableHead>
                <SortableHead label="Type" column="transaction_type" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <TableHead>Status</TableHead>
                <TableHead className="text-right">In</TableHead>
                <TableHead className="text-right">Out</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.rows.map((row) => {
                return (
                  <DataGridRow key={row.id} href={`/stock-transactions/${row.id}`}>
                    <TableCell>
                      <Link href={`/stock-transactions/${row.id}`} aria-label={`Quick view ${row.transaction_no}`} className="rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-primary group-hover:opacity-100">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{row.transaction_no}</TableCell>
                    <TableCell>{row.transaction_date}</TableCell>
                    <TableCell className="font-medium">
                      {row.item?.item_name ?? "Unknown"}
                      <p className="text-xs text-muted-foreground">{row.item?.item_code}</p>
                    </TableCell>
                    <TableCell>{row.location?.location_name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.transaction_type.replaceAll("_", " ")}</Badge>
                    </TableCell>
                    <TableCell><Badge variant={statusVariant(row.status)}>{row.status}</Badge></TableCell>
                    <TableCell className="text-right">{Number(row.quantity_in) > 0 ? `${formatNumber(row.quantity_in)} ${row.item?.base_unit ?? ""}` : "-"}</TableCell>
                    <TableCell className="text-right">{Number(row.quantity_out) > 0 ? `${formatNumber(row.quantity_out)} ${row.item?.base_unit ?? ""}` : "-"}</TableCell>
                    <TableCell className="text-right">{row.unit_cost ? formatCurrency(row.unit_cost) : "-"}</TableCell>
                    <TableCell className="text-right">{row.total_cost ? formatCurrency(row.total_cost) : "-"}</TableCell>
                    <TableCell>{row.reference_type ?? row.remarks ?? "-"}</TableCell>
                  </DataGridRow>
                );
              })}
              {!transactions.rows.length ? (
                <TableRow>
                  <TableCell colSpan={12}>
                    <EmptyState title="No stock transactions yet" description="Posted receiving, transfers, counts, and adjustments will appear here as ledger movements." />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          </div>
          <PaginationControls page={transactions.page} totalPages={transactions.totalPages} totalRows={transactions.totalRows} searchParams={filters} />
        </div>
        <div className="mt-4 rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground">
          Stock transaction rows are not edited or deleted. Use a correction movement if a posting is wrong.
        </div>
      </div>
    </>
  );
}
