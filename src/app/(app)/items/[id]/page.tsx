import { ItemForm } from "@/components/item-form";
import Link from "next/link";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { deleteItem, restoreBranchStockCountItem, restoreItem, updateItem } from "@/server/actions/items";
import { getItemCategories, getSuppliersForSelect } from "@/server/queries/common";
import { getItem, getItemsWithStock } from "@/server/queries/items";
import { getItemSourcingReadiness, getItemStockCountLifecycle, getItemStockCountRetirementHistory } from "@/server/queries/master-data";
import { hasPermission } from "@/server/auth/permissions";
import { PhaseOneDeleteAction } from "@/components/phase-one-delete-action";
import { detailOrNotFound } from "@/server/queries/detail";

export default async function EditItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const messages = await searchParams;
  const [item, suppliers, itemBalances, canCreateSupplier, sourcing, stockCountLifecycle, stockCountRetirementHistory, categories] = await Promise.all([detailOrNotFound(getItem(id)), getSuppliersForSelect(), getItemsWithStock(), hasPermission("suppliers.create"), getItemSourcingReadiness(id), getItemStockCountLifecycle(id), getItemStockCountRetirementHistory(id), getItemCategories()]);
  const balance = itemBalances.find((row) => row.id === id);
  const sourcingHref = sourcing.status === "master_only" ? `/supplier-items/new?itemId=${id}` : `/supplier-items?search=${encodeURIComponent(item.item_code)}`;
  const sourcingAction = sourcing.status === "master_only" ? "Add supplier mapping" : "Review sourcing";
  const lifecycleAction = item.deleted_at ? (
    <form action={restoreItem.bind(null, id)}><SubmitButton type="submit" className="w-full" pendingLabel="Restoring...">Restore Item</SubmitButton></form>
  ) : (
    <><PhaseOneDeleteAction recordType="item" recordId={id} label="item" /><DangerConfirmForm action={deleteItem.bind(null, id)} title="Deactivate this item?" description="This hides the item from active lists while preserving document and stock history." warning="This record may be linked to stock transactions, recipes, and purchasing history." checkboxLabel="I understand this may affect future operations." confirmWord="DEACTIVATE" triggerVariant="outline" triggerIcon="deactivate" buttonLabel="Deactivate item" pendingLabel="Deactivating..." /></>
  );

  return (
    <>
      <PageHeader title={item.item_name} description={`${item.item_code}${item.brand_name ? ` · ${item.brand_name}` : ""} · Item master`} />
      <RecordWorkspace actionPanel={<><RecordActionPanel title="Primary Action" description="Save master-data changes or return to the item list."><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Status</span><StatusBadge status={item.status} /></div><SubmitButton type="submit" form="item-edit-form" className="w-full" pendingLabel="Saving..." data-mobile-primary-action>Save Item</SubmitButton><Button asChild variant="outline" className="w-full"><Link href="/items">Back to Items</Link></Button></RecordActionPanel><RecordActionPanel title="Sourcing readiness" description="One place to see whether purchasing can use this item."><div className="flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">Current state</span><StatusBadge status={sourcing.status} /></div>{sourcing.supplierItems.length ? <p className="text-xs text-muted-foreground">{sourcing.supplierItems.length} supplier term{sourcing.supplierItems.length === 1 ? "" : "s"} · {sourcing.branchMappings.length} branch mapping{sourcing.branchMappings.length === 1 ? "" : "s"}</p> : <p className="text-xs text-muted-foreground">No active supplier term is linked yet.</p>}<Button asChild variant="outline" className="w-full"><Link href={sourcingHref}>{sourcingAction}</Link></Button>{sourcing.status !== "master_only" ? <Button asChild variant="ghost" className="w-full"><Link href={`/supplier-items?search=${encodeURIComponent(item.item_code)}`}>View all mappings</Link></Button> : null}</RecordActionPanel><RecordActionPanel title="More Options">{lifecycleAction}</RecordActionPanel><RecordActionPanel title="Metadata"><dl className="grid gap-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Created</dt><dd>{formatDateTime(item.created_at).slice(0, 10)}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Updated</dt><dd>{formatDateTime(item.updated_at).slice(0, 10)}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Current stock</dt><dd>{balance?.current_stock ?? 0} {item.base_unit}</dd></div></dl></RecordActionPanel></>}> 
        {messages.error || messages.success ? <Card><CardContent className={`p-4 text-sm ${messages.error ? "text-destructive" : "text-[var(--sb-success)]"}`}>{messages.error ?? messages.success}</CardContent></Card> : null}
        <ItemForm categories={categories} formId="item-edit-form" item={item} suppliers={suppliers} action={updateItem.bind(null, id)} showSubmit={false} canCreateSupplier={canCreateSupplier} />
        {stockCountLifecycle.length ? <Card><CardContent className="space-y-4 p-5"><div><h2 className="text-sm font-semibold">Branch Stock Count lifecycle</h2><p className="mt-1 text-xs text-muted-foreground">Branch retirement changes future counts only. Inventory and document history remain available.</p></div><div className="divide-y divide-[var(--sb-border-soft)]">{stockCountLifecycle.map((scope) => <div key={scope.id} className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{scope.branch?.branch_name ?? "Assigned branch"}</p><StatusBadge status={scope.status} /></div>{scope.retirement_note ? <p className="mt-1 text-sm text-muted-foreground">{scope.retirement_note}</p> : null}<p className="mt-1 text-xs text-muted-foreground">{scope.retired_at ? `Retired ${formatDateTime(scope.retired_at)}` : "Included in future Stock Counts"}{scope.last_physical_qty != null ? ` · final stock ${scope.last_physical_qty} ${item.base_unit}` : ""}</p></div>{scope.status === "retired" ? <form action={restoreBranchStockCountItem.bind(null, id, scope.id)} className="flex min-w-0 gap-2"><Input name="reason" minLength={3} maxLength={1000} required placeholder="Restore reason" className="min-w-40" /><SubmitButton variant="outline" pendingLabel="Restoring...">Restore</SubmitButton></form> : null}</div>)}</div></CardContent></Card> : null}
        {stockCountRetirementHistory.length ? <Card><CardContent className="space-y-4 p-5"><div><h2 className="text-sm font-semibold">Retirement history</h2><p className="mt-1 text-xs text-muted-foreground">Permanent final-count records remain here after an item is restored.</p></div><div className="divide-y divide-[var(--sb-border-soft)]">{stockCountRetirementHistory.map((event) => <div key={event.id} className="space-y-1 py-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{event.branch?.branch_name ?? "Assigned branch"}</p><StatusBadge status={event.status} /></div><p className="text-sm text-muted-foreground">{event.note}</p><p className="text-xs text-muted-foreground">Final stock {event.actual_qty} {item.base_unit} · requested by {event.requestedBy?.full_name ?? "authorised staff"} · {formatDateTime(event.created_at)}</p><Link href={`/stock-counts/${event.stock_count_id}`} className="inline-flex text-xs font-medium text-[var(--sb-accent-strong)] underline">Open final Stock Count</Link></div>)}</div></CardContent></Card> : null}
      </RecordWorkspace>
    </>
  );
}
