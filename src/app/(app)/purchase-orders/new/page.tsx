import { PurchaseOrderForm } from "@/components/procurement-forms";
import { PageHeader } from "@/components/ui/page-header";
import { createPurchaseOrder } from "@/server/actions/procurement";
import { getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";

export default async function NewPurchaseOrderPage() {
  const [items, suppliers] = await Promise.all([getItemsForSelect(), getSuppliersForSelect()]);
  return (
    <>
      <PageHeader title="New Purchase Order" description="Create a supplier purchase order. Receiving is intentionally not part of Sprint 3." />
      <div className="p-5">
        <PurchaseOrderForm items={items} suppliers={suppliers} action={createPurchaseOrder} />
      </div>
    </>
  );
}
