import { SupplierItemForm } from "@/components/master-data-forms";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { updateSupplierItem } from "@/server/actions/master-data";
import { getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";
import { getSupplierItem } from "@/server/queries/master-data";

export default async function EditSupplierItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supplierItem, suppliers, items] = await Promise.all([getSupplierItem(id), getSuppliersForSelect(), getItemsForSelect()]);
  const formId = "supplier-item-edit-form";
  return (
    <>
      <PageHeader title="Edit Supplier Item" description={supplierItem.supplier_item_name} />
      <RecordWorkspace actionPanel={<RecordActionPanel title="Supplier Item Actions" description="Save approved purchasing terms for this supplier item."><Button type="submit" form={formId} className="w-full" data-mobile-primary-action>Save supplier item</Button></RecordActionPanel>}>
        <SupplierItemForm formId={formId} showSubmit={false} supplierItem={supplierItem} suppliers={suppliers} items={items} action={updateSupplierItem.bind(null, id)} />
      </RecordWorkspace>
    </>
  );
}
