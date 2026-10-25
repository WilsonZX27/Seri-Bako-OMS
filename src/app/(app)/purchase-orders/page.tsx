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
  const emptyDescription = ordersResult.unavailable
    ? "The order source could not be verified. No record count or order total is shown as zero."
    : filtered
      ? "Reset the filters or widen the search."
      : permissions["po.create"]
        ? "Create a new order or convert an approved purchase request."
        : "Orders created by your team will appear here.";
  return (
    <>
      <PageHeader
        title="Purchase Orders"
        description="Supplier purchase orders created from approved requests or manually."
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
            <UnifiedListHeader className="sb-purchase-order-query" resultCount={orders?.totalRows} resetHref="/purchase-orders" filtered={filtered} activeCount={Number(Boolean(filters.status))} stableResponsive>
              <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search PO no or remarks" aria-label="Search purchase orders" className="min-w-0 flex-1 md:max-w-sm" />
              <StatusTabs statuses={statuses} activeStatus={filters.status} />

              {filtered ? <Button asChild variant="secondary" className="shrink-0" data-list-action="secondary"><Link href="/purchase-orders">Reset</Link></Button> : null}
              {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
            </UnifiedListHeader>
          <div className="sb-list-content-card overflow-hidden" data-mobile-list-content-card>
          {orders?.rows.length ? <DataGridHint text="Pro-tip: Double-click any row to open the purchase order." /> : null}
          <Table className="sb-procurement-table sb-purchase-orders-table !min-w-[51rem]" mobileHidden compactUntil="md" aria-label="Purchase orders" stickyColumn="second">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">Action</TableHead>
                  <SortableHead className="w-32 min-w-32" label="PO No" column="po_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead className="w-28" wrap label="Date / Delivery" column="order_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="w-36 max-w-36">Request context</TableHead>
                  <TableHead className="w-36">Supplier</TableHead>
                  <SortableHead className="w-36" label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="w-28 text-right">Order value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.rows.map((order) => (
                  <DataGridRow key={order.id} href={`/purchase-orders/${order.id}`} className="[&>td]:h-16 [&>td]:align-middle">
                    <TableCell className="w-10 p-0 text-center"><TableActionLink href={`/purchase-orders/${order.id}`} label={`Open ${order.po_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                    <TableCell className="w-32 min-w-32"><DocumentNumber value={order.po_no} size="sm" />{order.purchase_request_id && order.request_no ? <span className="mt-1 block text-[10px] italic text-muted-foreground"><Link href={`/purchase-requests/${order.purchase_request_id}`} className="text-[var(--sb-link)] underline-offset-4 hover:underline">{order.request_no}</Link></span> : null}</TableCell>
                    <TableCell className="w-32"><p>{formatDateOnly(order.order_date)}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateOnly(order.expected_delivery_date, "—")}</p></TableCell>
                    <TableCell className="w-36 max-w-36"><p className="whitespace-normal break-words">{order.branch_name ?? "No outlet assigned"}</p><p className="mt-1 whitespace-normal break-words text-[11px] text-muted-foreground">{order.requested_by_name ? `${order.purchase_request_id ? "Submitted" : "Created"} by ${order.requested_by_name}` : "Creator unavailable"}</p></TableCell>
                    <TableCell className="w-36 max-w-36"><span className="whitespace-normal break-words leading-4">{order.supplier_name ?? "-"}</span></TableCell>
                    <TableCell className="w-36"><StatusBadge status={order.status} /></TableCell>
                    <TableCell className="w-28 text-right"><p>{order.line_count} {order.line_count === 1 ? "line" : "lines"}</p><p className="mt-1 text-[11px] text-muted-foreground">{formatCurrency(order.order_total)}</p></TableCell>
                  </DataGridRow>
                ))}
                {!orders?.rows.length ? <TableRow><TableCell colSpan={7}><EmptyState title={ordersResult.unavailable ? "Purchase order data unavailable" : filtered ? "No orders match these filters" : "No purchase orders yet"} description={emptyDescription} action={ordersResult.unavailable ? { href: "/purchase-orders", label: "Retry orders" } : emptyStateAction} /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <OperationalList ariaLabel="Purchase orders" showUntil="md">
              {orders?.rows.map((order) => <OperationalListRow
                key={order.id}
                label={`Open ${order.po_no}`}
                primary={<div><Link href={`/purchase-orders/${order.id}`} className="inline-flex min-h-9 items-center rounded-[var(--sb-radius-control)] font-medium text-[var(--sb-link)] underline-offset-4 hover:underline"><DocumentNumber value={order.po_no} /></Link>{order.expected_delivery_date ? <p className="text-[11px] font-normal text-[var(--sb-text-muted)]">Delivery {formatDateOnly(order.expected_delivery_date)}</p> : null}</div>}
                status={<StatusBadge status={order.status} />}
                secondary={<span>{order.branch_name ?? "No outlet"} · {order.supplier_name ?? "No supplier"} · {formatDateOnly(order.order_date)}{order.purchase_request_id && order.request_no ? <> · <Button asChild variant="ghost" size="sm" className="px-0 text-[11px] font-medium text-[var(--sb-link)] underline-offset-4 hover:underline"><Link href={`/purchase-requests/${order.purchase_request_id}`}>{order.request_no}</Link></Button></> : null}</span>}
                meta={`${order.line_count} ${order.line_count === 1 ? "item" : "items"} · ${formatCurrency(order.order_total)}`}
              />)}
              {!orders?.rows.length ? <EmptyState title={ordersResult.unavailable ? "Purchase order data unavailable" : filtered ? "No orders match these filters" : "No purchase orders yet"} description={emptyDescription} action={ordersResult.unavailable ? { href: "/purchase-orders", label: "Retry orders" } : filtered ? emptyStateAction : undefined} /> : null}
            </OperationalList>
          {orders ? <PaginationControls page={orders.page} totalPages={orders.totalPages} totalRows={orders.totalRows} searchParams={filters} /> : null}
          </div>
        </div>
      </WorkspaceGrid>
    </>
  );
}
