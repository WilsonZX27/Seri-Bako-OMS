import { PurchaseRequestForm } from "@/components/procurement-forms";
import { PageHeader } from "@/components/ui/page-header";
import { createPurchaseRequest } from "@/server/actions/procurement";
import { getBranchesForSelect, getItemsForSelect, getLocationsForSelect, getSuppliersForSelect } from "@/server/queries/common";

export default async function NewPurchaseRequestPage() {
  const [items, suppliers, branches, locations] = await Promise.all([getItemsForSelect(), getSuppliersForSelect(), getBranchesForSelect(), getLocationsForSelect()]);
  return (
    <>
      <PageHeader title="New Purchase Request" description="Create a request from daily stock check or low-stock review." />
      <div className="p-5">
        <PurchaseRequestForm items={items} suppliers={suppliers} branches={branches} locations={locations} action={createPurchaseRequest} />
      </div>
    </>
  );
}
