import { SupplierItemForm } from "@/components/master-data-forms";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { SubmitButton } from "@/components/ui/submit-button";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteSupplierItem, restoreSupplierItem, updateSupplierItem } from "@/server/actions/master-data";
import { getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";
import { getSupplierItem } from "@/server/queries/master-data";

export default async function EditSupplierItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supplierItem, suppliers, items] = await Promise.all([getSupplierItem(id), getSuppliersForSelect(), getItemsForSelect()]);
  const formId = "supplier-item-edit-form";
  const lifecycleAction = supplierItem.deleted_at ? (
    <form action={restoreSupplierItem.bind(null, id)}><SubmitButton type="submit" className="w-full" pendingLabel="Restoring...">Restore supplier item</SubmitButton></form>
  ) : (
    <DangerConfirmForm action={deleteSupplierItem.bind(null, id)} title="Archive this supplier item?" description="This removes the purchasing term from active use while preserving history." warning="Existing purchase documents and audit history remain unchanged." checkboxLabel="I understand this supplier item will no longer be available for new purchasing." confirmWord="ARCHIVE" buttonLabel="Archive supplier item" pendingLabel="Archiving..." />
  );
  return (
    <>
      <PageHeader title="Edit Supplier Item" description={supplierItem.supplier_item_name} />
      <RecordWorkspace actionPanel={<><RecordActionPanel title="Supplier Item Actions" description="Save approved purchasing terms for this supplier item."><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Status</span><StatusBadge status={supplierItem.status} /></div><SubmitButton type="submit" form={formId} className="w-full" pendingLabel="Saving..." data-mobile-primary-action>Save supplier item</SubmitButton></RecordActionPanel><RecordActionPanel title="Lifecycle">{lifecycleAction}</RecordActionPanel></>}>
        <SupplierItemForm formId={formId} showSubmit={false} supplierItem={supplierItem} suppliers={suppliers} items={items} action={updateSupplierItem.bind(null, id)} />
      </RecordWorkspace>
    </>
  );
}
