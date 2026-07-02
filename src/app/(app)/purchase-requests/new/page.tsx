import { PurchaseRequestForm } from "@/components/procurement-forms";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createPurchaseRequest } from "@/server/actions/procurement";
import { hasPermission } from "@/server/auth/permissions";
import { getBranchesForSelect, getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";

export default async function NewPurchaseRequestPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const [items, suppliers, branches, canCreateItem, canCreateSupplier] = await Promise.all([
    getItemsForSelect(),
    getSuppliersForSelect(),
    getBranchesForSelect(),
    hasPermission("items.create"),
    hasPermission("suppliers.create"),
  ]);
  return (
    <>
      <PageHeader title="New Purchase Request" description="Create a request from daily stock check or low-stock review." />
      <div className="space-y-4 p-5">
        {params.error ? <Card><CardContent className="p-4 text-sm text-destructive">{params.error}</CardContent></Card> : null}
        <PurchaseRequestForm items={items} suppliers={suppliers} branches={branches} canCreateItem={canCreateItem} canCreateSupplier={canCreateSupplier} action={createPurchaseRequest} />
      </div>
    </>
  );
}
