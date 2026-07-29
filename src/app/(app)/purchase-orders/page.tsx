import { Pencil } from "lucide-react";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getPurchaseOrderSummary, getPurchaseOrders } from "@/server/queries/procurement";
import { getPermissionMap } from "@/server/auth/permissions";

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
  const [orders, summary, permissions] = await Promise.all([getPurchaseOrders(filters), getPurchaseOrderSummary(), getPermissionMap(["po.create"])]);
  const filtered = hasActiveFilters(filters);
  return (
    <>
      <PageHeader
        title="Purchase Orders"
        description="Supplier purchase orders created from approved requests or manually."
        action={permissions["po.create"] ? { href: "/purchase-orders/new", label: "New PO" } : undefined}
        secondaryAction={permissions["po.create"] ? { href: "/api/export/purchase-orders", label: "Export CSV" } : undefined}
      />
      <WorkspaceGrid
        className="pt-4"
        tabletRailMode="split"
        tabletRailBreakpoint="lg"
        hideMobileConsole
        rightRail={
          <>
            <ConsoleSection title="PO Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Total POs</span><strong>{summary.total}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ready to Send</span><strong>{summary.approved}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sent to Supplier</span><strong>{summary.sent}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Receiving</span><strong>{summary.receiving}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Received</span><strong>{summary.received}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Closed</span><strong>{summary.closed}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cancelled</span><strong>{summary.cancelled}</strong></div>
              </div>
            </ConsoleSection>
          </>
        }
      >
        <div className="overflow-hidden rounded-[2px] border border-[var(--sb-border-soft)] bg-card">
          <FilterBar resultCount={orders.totalRows} resetHref="/purchase-orders" filtered={filtered}>
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search PO no, supplier, remarks" className="min-w-0 flex-1 md:max-w-sm" />
            <StatusTabs statuses={statuses} activeStatus={filters.status} />
            <Button type="submit" variant="secondary" className="shrink-0">Search</Button>
            {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
          </FilterBar>
          <DataGridHint text="Pro-tip: Double-click any row to open the purchase order." />
          <Table mobileHidden aria-label="Purchase orders" stickyColumn="second">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">Action</TableHead>
                  <SortableHead label="PO No" column="po_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Supplier</TableHead>
                  <SortableHead className="hidden md:table-cell" label="Date" column="order_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead className="hidden lg:table-cell" label="Delivery" column="expected_delivery_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="hidden text-right lg:table-cell">Lines</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.rows.map((order) => (
                  <DataGridRow key={order.id} href={`/purchase-orders/${order.id}`}>
                    <TableCell className="w-10 p-0 text-center"><TableActionLink href={`/purchase-orders/${order.id}`} label={`Open ${order.po_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                    <TableCell><DocumentNumber value={order.po_no} size="sm" /></TableCell>
                    <TableCell>{order.supplier_name ?? "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{order.order_date}</TableCell>
                    <TableCell className="hidden lg:table-cell">{order.expected_delivery_date ?? "-"}</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell className="hidden text-right lg:table-cell">{order.line_count}</TableCell>
                    <TableCell className="hidden text-right md:table-cell">{formatCurrency(order.order_total)}</TableCell>
                  </DataGridRow>
                ))}
                {!orders.rows.length ? <TableRow><TableCell colSpan={8}><EmptyState title={filtered ? "No orders match these filters" : "No purchase orders yet"} description={filtered ? "Reset the filters or widen the search." : "Approved requests and new orders will appear here."} action={filtered ? { href: "/purchase-orders", label: "Reset filters" } : undefined} /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <OperationalList ariaLabel="Purchase orders">
              {orders.rows.map((order) => <OperationalListRow
                key={order.id}
                href={`/purchase-orders/${order.id}`}
                label={`Open ${order.po_no}`}
                primary={<div><DocumentNumber value={order.po_no} size="sm" /><p className="text-[11px] font-normal text-[var(--sb-text-muted)]">Delivery {order.expected_delivery_date ?? "not set"}</p></div>}
                status={<StatusBadge status={order.status} />}
                secondary={`${order.supplier_name ?? "No supplier"} · ${order.order_date}`}
                meta={`${order.line_count} items · ${formatCurrency(order.order_total)}`}
              />)}
              {!orders.rows.length ? <EmptyState title={filtered ? "No orders match these filters" : "No purchase orders yet"} description={filtered ? "Reset the filters or widen the search." : "Approved requests and new orders will appear here."} action={filtered ? { href: "/purchase-orders", label: "Reset filters" } : undefined} /> : null}
            </OperationalList>
          <PaginationControls page={orders.page} totalPages={orders.totalPages} totalRows={orders.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
