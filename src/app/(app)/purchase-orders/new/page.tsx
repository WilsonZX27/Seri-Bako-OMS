import { PurchaseOrderForm } from "@/components/procurement-forms";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { createPurchaseOrder } from "@/server/actions/procurement";
import { getBranchesForSelect, getBranchSupplierMappingsForSelect, getItemsForSelect } from "@/server/queries/common";

export default async function NewPurchaseOrderPage() {
  const [items, branches, supplierMappings] = await Promise.all([getItemsForSelect(), getBranchesForSelect(), getBranchSupplierMappingsForSelect()]);
  return (
    <>
      <PageHeader title="New Purchase Order" description="Create a supplier purchase order. Receiving is intentionally not part of Sprint 3." />
      <WorkspaceGrid
        documentMode
        tabletRailMode="split"
        rightRail={
          <div>
            <ConsoleSection title="PO Actions">
              <div className="grid gap-2">
                <Button type="submit" form="purchase-order-form" className="w-full" data-mobile-primary-action>Create PO</Button>
                <Button type="submit" form="purchase-order-form" variant="outline" className="w-full">Save Draft</Button>
              </div>
            </ConsoleSection>
            <ConsoleSection title="PO Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">PO Number</span><strong>Auto</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Supplier mappings</span><strong>{supplierMappings.length ? "Available" : "Missing"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Items</span><strong>{items.length}</strong></div>
              </div>
            </ConsoleSection>
          </div>
        }
      >
        <PurchaseOrderForm items={items} branches={branches} supplierMappings={supplierMappings} action={createPurchaseOrder} />
      </WorkspaceGrid>
    </>
  );
}
