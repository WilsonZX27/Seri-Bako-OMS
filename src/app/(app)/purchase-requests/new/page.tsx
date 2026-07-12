import { PurchaseRequestForm } from "@/components/procurement-forms";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { createPurchaseRequest } from "@/server/actions/procurement";
import { hasPermission } from "@/server/auth/permissions";
import { getBranchesForSelect, getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";

export default async function NewPurchaseRequestPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const [items, suppliers, branches, canCreateItem, canCreateSupplier] = await Promise.all([
    getItemsForSelect(),
    getSuppliersForSelect(),
    getBranchesForSelect(),
    hasPermission("items.create"),
    hasPermission("suppliers.create"),
  ]);
  const initialItem = params.item_id ? items.find((item) => item.id === params.item_id) : null;
  const initialLine = initialItem ? {
    itemId: initialItem.id,
    itemSearch: `${initialItem.item_code} - ${initialItem.item_name}`,
    qty: params.qty ?? "",
    uom: params.uom ?? initialItem.purchase_unit ?? initialItem.base_unit,
    supplierId: params.supplier_id ?? initialItem.supplier_id ?? "",
    cost: String(initialItem.cost ?? 0),
    remarks: params.notes ?? "",
  } : undefined;
  return (
    <>
      <PageHeader title="New Purchase Request" description="Create a request from daily stock check or low-stock review." />
      <WorkspaceGrid
        rightRail={
          <div>
            <ConsoleSection title="PR Actions">
              <div className="grid gap-2">
                <SubmitButton type="submit" form="purchase-request-form" pendingLabel="Creating..." className="w-full">Submit PR</SubmitButton>
                <SubmitButton type="submit" form="purchase-request-form" pendingLabel="Saving..." variant="outline" className="w-full">Save Draft</SubmitButton>
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
        <PurchaseRequestForm
          items={items}
          suppliers={suppliers}
          branches={branches}
          initialBranchId={params.branch_id}
          initialLine={initialLine}
          initialRemarks={params.notes}
          canCreateItem={canCreateItem}
          canCreateSupplier={canCreateSupplier}
          action={createPurchaseRequest}
        />
      </WorkspaceGrid>
    </>
  );
}
