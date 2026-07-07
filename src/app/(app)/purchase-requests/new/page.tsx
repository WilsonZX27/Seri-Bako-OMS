import { PurchaseRequestForm } from "@/components/procurement-forms";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
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
      <WorkspaceGrid
        rightRail={
          <div>
            <ConsoleSection title="PR Actions">
              <div className="grid gap-2">
                <Button type="submit" form="purchase-request-form" className="w-full">Submit PR</Button>
                <Button type="submit" form="purchase-request-form" variant="outline" className="w-full">Save Draft</Button>
              </div>
            </ConsoleSection>
            <ConsoleSection title="Request Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Status</span><strong>Draft</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Number</span><strong>Auto</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Lines</span><strong>Review before submit</strong></div>
              </div>
            </ConsoleSection>
          </div>
        }
      >
        {params.error ? <Card><CardContent className="p-4 text-sm text-destructive">{params.error}</CardContent></Card> : null}
        <PurchaseRequestForm items={items} suppliers={suppliers} branches={branches} canCreateItem={canCreateItem} canCreateSupplier={canCreateSupplier} action={createPurchaseRequest} />
      </WorkspaceGrid>
    </>
  );
}
