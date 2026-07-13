import Link from "next/link";
import { Eye } from "lucide-react";
import { BulkSelectAllCheckbox, BulkSelectionProvider, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatNumber } from "@/lib/utils";
import { getGoodsReceivings } from "@/server/queries/goods-receivings";

const statuses = ["draft", "posted", "cancelled"];

export default async function GoodsReceivingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [receivings, allReceivings] = await Promise.all([getGoodsReceivings(filters), getGoodsReceivings({ page: "all" })]);
  const rows = allReceivings.rows;
  const count = (...statuses: string[]) => rows.filter((receiving) => statuses.includes(receiving.status)).length;
  const receivedTotal = rows.reduce((sum, receiving) => sum + receiving.received_total, 0);
  const rejectedTotal = rows.reduce((sum, receiving) => sum + receiving.rejected_total, 0);
  return (
    <>
      <PageHeader
        title="Goods Receiving"
        description="Receive supplier deliveries against approved purchase orders. Stock increases only after GRN posting."
        action={{ href: "/goods-receivings/new", label: "New GRN" }}
      />
      <WorkspaceGrid
        rightRail={
          <>
            <ConsoleSection title="GRN Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Total GRNs</span><strong>{rows.length}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Draft</span><strong>{count("draft")}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Posted</span><strong>{count("posted")}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cancelled</span><strong>{count("cancelled")}</strong></div>
              </div>
              <div className="my-3 border-t" />
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Received Qty</span><strong>{formatNumber(receivedTotal)}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Rejected Qty</span><strong>{formatNumber(rejectedTotal)}</strong></div>
              </div>
            </ConsoleSection>
          </>
        }
      >
        <div className="overflow-hidden rounded-[2px] border border-[var(--sb-border-soft)] bg-card">
          <StatusTabs statuses={statuses} activeStatus={filters.status} />
          <form className="flex flex-col gap-3 border-b bg-white p-4 md:flex-row md:items-center">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search GRN no, PO, supplier, location" className="md:max-w-sm" />
            <Button type="submit" variant="secondary">Search</Button>
            <Button asChild variant="ghost"><a href="?">Reset</a></Button>
          </form>
          <BulkSelectionProvider ids={receivings.rows.map((receiving) => receiving.id)} actionLabel="Archive selected" actionHint="Open selected GRNs to post or cancel them through workflow-safe actions. Posted receiving records are never hard deleted.">
          <DataGridHint text="Pro-tip: Double-click any row to open the goods receiving document." />
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
                        <Link href={`/goods-receivings/${receiving.id}`} aria-label={`Quick view ${receiving.grn_no}`} className="rounded-none p-1 text-[var(--sb-text-soft)] opacity-0 hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-amber-700)] group-hover:opacity-100">
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
                {!receivings.rows.length ? <TableRow><TableCell colSpan={9}><EmptyState title="No goods receivings found" description="Receiving records will appear here after supplier deliveries are recorded." /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          </BulkSelectionProvider>
          <PaginationControls page={receivings.page} totalPages={receivings.totalPages} totalRows={receivings.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
