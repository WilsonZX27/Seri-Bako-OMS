import { PurchaseRequestForm } from "@/components/procurement-forms";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createPurchaseRequest } from "@/server/actions/procurement";
import { getBranchesForSelect, getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";

export default async function NewPurchaseRequestPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const [items, suppliers, branches] = await Promise.all([getItemsForSelect(), getSuppliersForSelect(), getBranchesForSelect()]);
  return (
    <>
      <PageHeader title="New Purchase Request" description="Create a request from daily stock check or low-stock review." />
      <div className="space-y-4 p-5">
        {params.error ? <Card><CardContent className="p-4 text-sm text-destructive">{params.error}</CardContent></Card> : null}
        <PurchaseRequestForm items={items} suppliers={suppliers} branches={branches} action={createPurchaseRequest} />
      </div>
    </>
  );
}
