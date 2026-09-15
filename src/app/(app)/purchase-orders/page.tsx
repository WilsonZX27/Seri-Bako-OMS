import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { UnifiedListHeader } from "@/components/common/UnifiedListHeader";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getPurchaseOrderSummary, getPurchaseOrders } from "@/server/queries/procurement";
import { getPermissionMap } from "@/server/auth/permissions";
import { PurchaseOrderExportDialog } from "@/components/purchase-order-export-dialog";
import { getBranchesForSelect } from "@/server/queries/common";
import { logServerError } from "@/server/observability/logger";

const statuses = [
  { value: "approved", label: "Ready to Send" },
  { value: "sent", label: "Sent to Supplier" },
  { value: "receiving", label: "Receiving" },
  { value: "received", label: "Received" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

async function loadExportBranches() {
  try {
    return await getBranchesForSelect({ restrictToActorScope: true });
  } catch (error) {
    logServerError(error, { source: "page.purchaseOrders.exportBranches" });
    return null;
  }
}

async function loadOrders(filters: Record<string, string | undefined>) {
  try {
    return { data: await getPurchaseOrders(filters), unavailable: false };
  } catch (error) {
    logServerError(error, { source: "page.purchaseOrders.list" });
    return { data: null, unavailable: true };
  }
}

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [ordersResult, permissions, [summaryResult]] = await Promise.all([loadOrders(filters), getPermissionMap(["po.create"]), Promise.allSettled([getPurchaseOrderSummary()])]);
  const orders = ordersResult.data;
  if (summaryResult.status === "rejected") logServerError(summaryResult.reason, { source: "page.purchaseOrders.summary" });
  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const exportBranches = permissions["po.create"] ? await loadExportBranches() : [];
  const filtered = hasActiveFilters(filters);
  const emptyStateAction = filtered
    ? { href: "/purchase-orders", label: "Reset filters" }
    : permissions["po.create"]
      ? { href: "/purchase-orders/new", label: "New PO" }
      : undefined;
  return (
    <>
      <PageHeader
        title="Purchase Orders"
        description="Supplier purchase orders created from approved requests or manually."
        action={permissions["po.create"] ? { href: "/purchase-orders/new", label: "New PO" } : undefined}
        hideTabletCreateFab
      />
      <WorkspaceGrid
        className="pt-4"
        tabletRailMode="split"
        tabletRailBreakpoint="md"
        hideMobileConsole
        rightRail={
          <div className="space-y-3 [&>section]:overflow-hidden [&>section]:rounded-[var(--sb-panel-radius)] [&>section]:border [&>section]:border-[var(--sb-border-soft)] [&>section]:bg-card" data-tablet-split-actions data-purchase-order-tablet-rail>
            {permissions["po.create"] ? <ConsoleSection title="Actions"><div className="grid gap-2">
              <Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/purchase-orders/new"><Plus className="h-4 w-4" />New PO</Link></Button>
              {exportBranches ? <PurchaseOrderExportDialog branches={exportBranches} /> : <div role="status"><Button type="button" variant="outline" className="w-full" disabled>Export unavailable</Button><p className="mt-1.5 text-xs text-muted-foreground">Branch options could not be loaded. The order queue remains available; retry before exporting.</p></div>}
            </div></ConsoleSection> : null}
            <ConsoleSection title="PO Summary">
              {summary ? <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Total POs</span><strong>{summary.total}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ready to Send</span><strong>{summary.approved}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sent to Supplier</span><strong>{summary.sent}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Receiving</span><strong>{summary.receiving}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Received</span><strong>{summary.received}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Closed</span><strong>{summary.closed}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cancelled</span><strong>{summary.cancelled}</strong></div>
              </div> : <div role="status"><p className="text-xs font-semibold text-[var(--sb-warning)]">Unavailable</p><p className="mt-1 text-xs text-muted-foreground">The order queue remains current. Retry to load PO totals.</p></div>}
            </ConsoleSection>
          </div>
        }
      >
        <div className="space-y-3" data-tablet-main-list>
            <UnifiedListHeader resultCount={orders?.totalRows} resetHref="/purchase-orders" filtered={filtered} activeCount={Number(Boolean(filters.status))}>
              <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search PO no or remarks" className="min-w-0 flex-1 md:max-w-sm" />
              <StatusTabs statuses={statuses} activeStatus={filters.status} />
              <Button type="submit" variant="secondary" className="shrink-0" data-list-action="primary">Search</Button>
              {filtered ? <Button asChild variant="secondary" className="shrink-0" data-list-action="secondary"><Link href="/purchase-orders">Reset</Link></Button> : null}
              {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
            </UnifiedListHeader>
          <div className="sb-list-content-card overflow-hidden" data-mobile-list-content-card>
          <DataGridHint text="Pro-tip: Double-click any row to open the purchase order." />
          <Table mobileHidden compactUntil="md" aria-label="Purchase orders" stickyColumn="second">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">Action</TableHead>
                  <SortableHead className="min-w-36" label="PO No / PR No" column="po_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="w-40 max-w-40">Request context</TableHead>
                  <TableHead className="w-52">Supplier</TableHead>
                  <SortableHead className="hidden md:table-cell" label="Date" column="order_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead className="hidden lg:table-cell" label="Delivery" column="expected_delivery_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="hidden text-right md:table-cell">Order value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.rows.map((order) => (
                  <DataGridRow key={order.id} href={`/purchase-orders/${order.id}`} className="[&>td]:h-16 [&>td]:align-top">
                    <TableCell className="w-10 p-0 text-center"><TableActionLink href={`/purchase-orders/${order.id}`} label={`Open ${order.po_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                    <TableCell className="min-w-36"><DocumentNumber value={order.po_no} size="sm" />{order.purchase_request_id && order.request_no ? <span className="mt-1 block text-[10px] italic text-muted-foreground"><Link href={`/purchase-requests/${order.purchase_request_id}`} className="text-[var(--sb-link)] underline-offset-4 hover:underline">{order.request_no}</Link></span> : null}</TableCell>
                    <TableCell className="w-40 max-w-40"><p className="truncate">{order.branch_name ?? "No outlet assigned"}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{order.requested_by_name ? `${order.purchase_request_id ? "Submitted" : "Created"} by ${order.requested_by_name}` : "Creator unavailable"}</p></TableCell>
                    <TableCell className="w-52 max-w-52"><span className="line-clamp-2 leading-4">{order.supplier_name ?? "-"}</span></TableCell>
                    <TableCell className="hidden md:table-cell">{formatDateOnly(order.order_date)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{formatDateOnly(order.expected_delivery_date, "-")}</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell className="hidden text-right md:table-cell"><p>{order.line_count} lines</p><p className="mt-1 text-[11px] text-muted-foreground">{formatCurrency(order.order_total)}</p></TableCell>
                  </DataGridRow>
                ))}
                {!orders?.rows.length ? <TableRow><TableCell colSpan={8}><EmptyState title={ordersResult.unavailable ? "Purchase order data unavailable" : filtered ? "No orders match these filters" : "No purchase orders yet"} description={ordersResult.unavailable ? "The order source could not be verified. No record count or order total is shown as zero." : filtered ? "Reset the filters or widen the search." : "Approved requests and new orders will appear here."} action={ordersResult.unavailable ? { href: "/purchase-orders", label: "Retry orders" } : emptyStateAction} /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <OperationalList ariaLabel="Purchase orders" showUntil="md">
              {orders?.rows.map((order) => <OperationalListRow
                key={order.id}
                label={`Open ${order.po_no}`}
                primary={<div><Link href={`/purchase-orders/${order.id}`} className="inline-flex min-h-9 items-center rounded-[var(--sb-radius-control)] font-medium text-[var(--sb-link)] underline-offset-4 hover:underline"><DocumentNumber value={order.po_no} /></Link>{order.expected_delivery_date ? <p className="text-[11px] font-normal text-[var(--sb-text-muted)]">Delivery {formatDateOnly(order.expected_delivery_date)}</p> : null}</div>}
                status={<StatusBadge status={order.status} />}
                secondary={<span>{order.branch_name ?? "No outlet"} · {order.supplier_name ?? "No supplier"} · {formatDateOnly(order.order_date)}{order.purchase_request_id && order.request_no ? <> · <Link href={`/purchase-requests/${order.purchase_request_id}`} className="font-medium text-[var(--sb-link)] underline-offset-4 hover:underline">{order.request_no}</Link></> : null}</span>}
                meta={`${order.line_count} items · ${formatCurrency(order.order_total)}`}
              />)}
              {!orders?.rows.length ? <EmptyState title={ordersResult.unavailable ? "Purchase order data unavailable" : filtered ? "No orders match these filters" : "No purchase orders yet"} description={ordersResult.unavailable ? "The order source could not be verified. No record count or order total is shown as zero." : filtered ? "Reset the filters or widen the search." : "Approved requests and new orders will appear here."} action={ordersResult.unavailable ? { href: "/purchase-orders", label: "Retry orders" } : emptyStateAction} /> : null}
            </OperationalList>
          {orders ? <PaginationControls page={orders.page} totalPages={orders.totalPages} totalRows={orders.totalRows} searchParams={filters} /> : null}
          </div>
        </div>
      </WorkspaceGrid>
      {permissions["po.create"] ? <Button asChild size="icon" className="fixed bottom-[calc(var(--sb-mobile-nav-height)+env(safe-area-inset-bottom)+1rem)] right-4 z-[var(--sb-z-sticky)] h-14 w-14 rounded-full shadow-[var(--sb-shadow-sm)] md:hidden"><Link href="/purchase-orders/new" aria-label="New purchase order"><Plus className="h-5 w-5" /></Link></Button> : null}
    </>
  );
}
