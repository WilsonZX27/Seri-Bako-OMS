import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Eye, FileText, Truck, XCircle } from "lucide-react";
import { BulkSelectAllCheckbox, BulkSelectionProvider, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { KpiFilterStrip } from "@/components/ui/kpi-filter-strip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const poInsights = [
    { label: "Total", value: rows.length, href: "/purchase-orders", active: !filters.status, icon: FileText },
    { label: "Ready to Send", value: count("approved"), href: "/purchase-orders?status=approved", active: filters.status === "approved", icon: Truck },
    { label: "Sent to Supplier", value: count("sent"), href: "/purchase-orders?status=sent", active: filters.status === "sent", icon: Truck },
    { label: "Receiving", value: count("partial_received"), href: "/purchase-orders?status=receiving", active: filters.status === "receiving", icon: ClipboardCheck },
    { label: "Received", value: count("received"), href: "/purchase-orders?status=received", active: filters.status === "received", icon: CheckCircle2 },
    { label: "Closed", value: count("closed"), href: "/purchase-orders?status=closed", active: filters.status === "closed", icon: CheckCircle2 },
    { label: "Cancelled", value: count("cancelled"), href: "/purchase-orders?status=cancelled", active: filters.status === "cancelled", icon: XCircle },
  ];
  return (
    <>
      <PageHeader title="Purchase Orders" description="Supplier purchase orders created from approved requests or manually." action={{ href: "/purchase-orders/new", label: "New PO" }} secondaryAction={{ href: "/api/export/purchase-orders", label: "Export CSV" }} />
      <div className="space-y-4 p-5">
        <KpiFilterStrip items={poInsights} />
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
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
                        <Link href={`/purchase-orders/${order.id}`} aria-label={`Quick view ${order.po_no}`} className="rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-primary group-hover:opacity-100">
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
      </div>
    </>
  );
}
