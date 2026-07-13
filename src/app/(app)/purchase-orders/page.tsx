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
import { formatCurrency } from "@/lib/utils";
import { getPurchaseOrders } from "@/server/queries/procurement";

const statuses = [
  { value: "approved", label: "Ready to Send" },
  { value: "sent", label: "Sent to Supplier" },
  { value: "receiving", label: "Receiving" },
  { value: "received", label: "Received" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [orders, allOrders] = await Promise.all([getPurchaseOrders(filters), getPurchaseOrders({ page: "all" })]);
  const rows = allOrders.rows;
  const count = (...statuses: string[]) => rows.filter((order) => statuses.includes(order.status)).length;
  const totalValue = rows.reduce((sum, order) => sum + order.order_total, 0);
  return (
    <>
      <PageHeader title="Purchase Orders" description="Supplier purchase orders created from approved requests or manually." action={{ href: "/purchase-orders/new", label: "New PO" }} secondaryAction={{ href: "/api/export/purchase-orders", label: "Export CSV" }} />
      <WorkspaceGrid
        className="pt-4"
        rightRail={
          <ConsoleSection title="PO Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Total POs</span><strong>{rows.length}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ready to Send</span><strong>{count("approved")}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sent to Supplier</span><strong>{count("sent")}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Receiving</span><strong>{count("partial_received", "receiving")}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Received</span><strong>{count("received")}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Closed</span><strong>{count("closed")}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cancelled</span><strong>{count("cancelled")}</strong></div>
              </div>
              <div className="my-3 border-t" />
              <div className="flex items-end justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Total PO Value</p>
                <p className="text-base font-semibold">{formatCurrency(totalValue)}</p>
              </div>
            </ConsoleSection>
        }
      >
        <div className="overflow-hidden rounded-[2px] border border-[var(--sb-border-soft)] bg-card">
          <StatusTabs statuses={statuses} activeStatus={filters.status} />
          <form className="flex flex-col gap-3 border-b bg-white p-4 md:flex-row md:items-center">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search PO no, supplier, remarks" className="md:max-w-sm" />
            <Button type="submit" variant="secondary">Search</Button>
            <Button asChild variant="ghost"><a href="?">Reset</a></Button>
          </form>
          <BulkSelectionProvider ids={orders.rows.map((order) => order.id)} actionLabel="Archive selected" actionHint="Open selected POs to close, reject, or cancel them through workflow-safe actions.">
          <DataGridHint text="Pro-tip: Double-click any row to open the purchase order." />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20"><BulkSelectAllCheckbox /></TableHead>
                  <SortableHead label="PO No" column="po_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Supplier</TableHead>
                  <SortableHead label="Date" column="order_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Delivery" column="expected_delivery_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.rows.map((order) => (
                  <DataGridRow key={order.id} href={`/purchase-orders/${order.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BulkSelectRowCheckbox id={order.id} />
                        <Link href={`/purchase-orders/${order.id}`} aria-label={`Quick view ${order.po_no}`} className="rounded-none p-1 text-[var(--sb-text-soft)] opacity-0 hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-amber-700)] group-hover:opacity-100">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell><DocumentNumber value={order.po_no} size="sm" /></TableCell>
                    <TableCell>{order.supplier_name ?? "-"}</TableCell>
                    <TableCell>{order.order_date}</TableCell>
                    <TableCell>{order.expected_delivery_date ?? "-"}</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell className="text-right">{order.line_count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.order_total)}</TableCell>
                  </DataGridRow>
                ))}
                {!orders.rows.length ? <TableRow><TableCell colSpan={8}><EmptyState title="No purchase orders found" description="Purchase orders will appear here after approved requests are converted or a new PO is created." action={{ href: "/purchase-orders/new", label: "New PO" }} /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          </BulkSelectionProvider>
          <PaginationControls page={orders.page} totalPages={orders.totalPages} totalRows={orders.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
