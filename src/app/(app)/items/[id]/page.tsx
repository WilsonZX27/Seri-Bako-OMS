import { ItemForm } from "@/components/item-form";
import { PageHeader } from "@/components/ui/page-header";
import { updateItem } from "@/server/actions/items";
import { getSuppliersForSelect } from "@/server/queries/common";
import { getItem, getItemsWithStock } from "@/server/queries/items";

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, suppliers, itemBalances] = await Promise.all([getItem(id), getSuppliersForSelect(), getItemsWithStock()]);
  const balance = itemBalances.find((row) => row.id === id);

  return (
    <>
      <PageHeader title="Edit Item" description={item.item_name} />
      <div className="p-5">
        <ItemForm item={item} suppliers={suppliers} currentStock={balance?.current_stock} action={updateItem.bind(null, id)} />
      </div>
    </>
  );
}
