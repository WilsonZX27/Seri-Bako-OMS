import { ItemForm } from "@/components/item-form";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { deleteItem, updateItem } from "@/server/actions/items";
import { getSuppliersForSelect } from "@/server/queries/common";
import { getItem, getItemsWithStock } from "@/server/queries/items";

export default async function EditItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const messages = await searchParams;
  const [item, suppliers, itemBalances] = await Promise.all([getItem(id), getSuppliersForSelect(), getItemsWithStock()]);
  const balance = itemBalances.find((row) => row.id === id);

  return (
    <>
      <PageHeader title="Edit Item" description={item.item_name} />
      <div className="space-y-4 p-5">
        {messages.error || messages.success ? <Card><CardContent className={`p-4 text-sm ${messages.error ? "text-destructive" : "text-emerald-700"}`}>{messages.error ?? messages.success}</CardContent></Card> : null}
        <ItemForm item={item} suppliers={suppliers} currentStock={balance?.current_stock} action={updateItem.bind(null, id)} />
        <DangerConfirmForm
          action={deleteItem.bind(null, id)}
          title="Deactivate this item?"
          description="This will hide the record from active lists. Existing documents and stock history will remain linked."
          warning="This record may be linked to stock transactions, barcode mappings, recipes, and purchasing history."
          checkboxLabel="I understand this does not delete history and may affect future operations."
          confirmWord="DEACTIVATE"
          buttonLabel="Deactivate item"
          pendingLabel="Deactivating..."
        />
      </div>
    </>
  );
}
