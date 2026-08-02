import { SupplierItemForm } from "@/components/master-data-forms";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { SubmitButton } from "@/components/ui/submit-button";
import { PageHeader } from "@/components/ui/page-header";
import { createSupplierItem } from "@/server/actions/master-data";
import { getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";

export default async function NewSupplierItemPage() {
  const [suppliers, items] = await Promise.all([getSuppliersForSelect(), getItemsForSelect()]);
  const formId = "supplier-item-create-form";
  return (
    <>
      <PageHeader title="New Supplier Item" description="Map supplier product codes and purchasing UOM to Seri Bako Item Master." />
      <RecordWorkspace actionPanel={<RecordActionPanel title="Supplier Item Actions" description="Create the supplier-to-item purchasing terms."><SubmitButton type="submit" form={formId} className="w-full" pendingLabel="Creating..." data-mobile-primary-action>Create supplier item</SubmitButton></RecordActionPanel>}>
        <SupplierItemForm formId={formId} showSubmit={false} suppliers={suppliers} items={items} action={createSupplierItem} />
      </RecordWorkspace>
    </>
  );
}
