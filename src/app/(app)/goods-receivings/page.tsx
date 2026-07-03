import Link from "next/link";
import { Eye } from "lucide-react";
import { BulkSelectAllCheckbox, BulkSelectionProvider, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { getGoodsReceivings } from "@/server/queries/goods-receivings";

const statuses = ["draft", "posted", "cancelled"];

export default async function GoodsReceivingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const receivings = await getGoodsReceivings(filters);
  return (
    <>
      <PageHeader
        title="Goods Receiving"
        description="Receive supplier deliveries against approved purchase orders. Stock increases only after GRN posting."
        action={{ href: "/goods-receivings/new", label: "New GRN" }}
        secondaryAction={{ href: "/goods-receivings/scan", label: "Scan Mode" }}
      />
      <div className="p-5">
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <StatusTabs statuses={statuses} activeStatus={filters.status} />
          <form className="flex flex-col gap-3 border-b bg-white p-4 md:flex-row md:items-center">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search GRN no, PO, supplier, location" className="md:max-w-sm" />
            <Button type="submit" variant="secondary">Search</Button>
            <Button asChild variant="ghost"><a href="?">Reset</a></Button>
          </form>
          <BulkSelectionProvider ids={receivings.rows.map((receiving) => receiving.id)} actionLabel="Archive selected" actionHint="Open selected GRNs to post or cancel them through workflow-safe actions. Posted receiving records are never hard deleted.">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20"><BulkSelectAllCheckbox /></TableHead>
                  <SortableHead label="GRN No" column="grn_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>PO</TableHead>
                  <TableHead>Supplier</TableHead>
                  <SortableHead label="Received" column="received_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Location</TableHead>
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivings.rows.map((receiving) => (
                  <DataGridRow key={receiving.id} href={`/goods-receivings/${receiving.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BulkSelectRowCheckbox id={receiving.id} />
                        <Link href={`/goods-receivings/${receiving.id}`} aria-label={`Quick view ${receiving.grn_no}`} className="rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-primary group-hover:opacity-100">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell><DocumentNumber value={receiving.grn_no} size="sm" /></TableCell>
                    <TableCell>{receiving.po_no ?? "-"}</TableCell>
                    <TableCell>{receiving.supplier_name ?? "-"}</TableCell>
                    <TableCell>{receiving.received_date}</TableCell>
                    <TableCell>{receiving.location_name ?? "-"}</TableCell>
                    <TableCell><StatusBadge status={receiving.status} /></TableCell>
                    <TableCell className="text-right">{formatNumber(receiving.received_total)}</TableCell>
                    <TableCell className="text-right">{formatNumber(receiving.rejected_total)}</TableCell>
                  </DataGridRow>
                ))}
                {!receivings.rows.length ? <TableRow><TableCell colSpan={9}><EmptyState title="No goods receivings found" description="Receiving records will appear here after supplier deliveries are recorded." action={{ href: "/goods-receivings/new", label: "New GRN" }} /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          </BulkSelectionProvider>
          <PaginationControls page={receivings.page} totalPages={receivings.totalPages} totalRows={receivings.totalRows} searchParams={filters} />
        </div>
      </div>
    </>
  );
}
