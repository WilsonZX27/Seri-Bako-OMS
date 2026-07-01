import { SupplierItemForm } from "@/components/master-data-forms";
import { PageHeader } from "@/components/ui/page-header";
import { updateSupplierItem } from "@/server/actions/master-data";
import { getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";
import { getSupplierItem } from "@/server/queries/master-data";

export default async function EditSupplierItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supplierItem, suppliers, items] = await Promise.all([getSupplierItem(id), getSuppliersForSelect(), getItemsForSelect()]);
  return (
    <>
      <PageHeader title="Edit Supplier Item" description={supplierItem.supplier_item_name} />
      <div className="p-5">
        <SupplierItemForm supplierItem={supplierItem} suppliers={suppliers} items={items} action={updateSupplierItem.bind(null, id)} />
      </div>
    </>
  );
}
