import { ItemForm } from "@/components/item-form";
import Link from "next/link";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteItem, restoreItem, updateItem } from "@/server/actions/items";
import { getSuppliersForSelect } from "@/server/queries/common";
import { getItem, getItemsWithStock } from "@/server/queries/items";

export default async function EditItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const messages = await searchParams;
  const [item, suppliers, itemBalances] = await Promise.all([getItem(id), getSuppliersForSelect(), getItemsWithStock()]);
  const balance = itemBalances.find((row) => row.id === id);
  const lifecycleAction = item.deleted_at ? (
    <form action={restoreItem.bind(null, id)}><Button type="submit" className="w-full">Restore Item</Button></form>
  ) : (
    <DangerConfirmForm action={deleteItem.bind(null, id)} title="Deactivate this item?" description="This hides the item from active lists while preserving document and stock history." warning="This record may be linked to stock transactions, recipes, and purchasing history." checkboxLabel="I understand this may affect future operations." confirmWord="DEACTIVATE" buttonLabel="Deactivate item" pendingLabel="Deactivating..." />
  );

  return (
    <>
      <PageHeader title={item.item_name} description={`${item.item_code} · Item master`} />
      <RecordWorkspace actionPanel={<><RecordActionPanel title="Item Actions" description="Save master-data changes or return to the item list."><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Status</span><StatusBadge status={item.status} /></div><Button type="submit" form="item-edit-form" className="w-full">Save Item</Button><Button asChild variant="outline" className="w-full"><Link href="/items">Back to Items</Link></Button></RecordActionPanel><RecordActionPanel title="Lifecycle">{lifecycleAction}</RecordActionPanel><RecordActionPanel title="Metadata"><dl className="grid gap-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Created</dt><dd>{new Date(item.created_at).toLocaleDateString("en-MY")}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Updated</dt><dd>{new Date(item.updated_at).toLocaleDateString("en-MY")}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Current stock</dt><dd>{balance?.current_stock ?? 0} {item.base_unit}</dd></div></dl></RecordActionPanel></>}>
        {messages.error || messages.success ? <Card><CardContent className={`p-4 text-sm ${messages.error ? "text-destructive" : "text-emerald-700"}`}>{messages.error ?? messages.success}</CardContent></Card> : null}
        <ItemForm formId="item-edit-form" item={item} suppliers={suppliers} action={updateItem.bind(null, id)} showSubmit={false} />
      </RecordWorkspace>
    </>
  );
}
