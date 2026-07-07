import { PurchaseOrderForm } from "@/components/procurement-forms";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { createPurchaseOrder } from "@/server/actions/procurement";
import { getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";

export default async function NewPurchaseOrderPage() {
  const [items, suppliers] = await Promise.all([getItemsForSelect(), getSuppliersForSelect()]);
  return (
    <>
      <PageHeader title="New Purchase Order" description="Create a supplier purchase order. Receiving is intentionally not part of Sprint 3." />
      <WorkspaceGrid
        rightRail={
          <div className="space-y-3">
            <section className="rounded-lg border bg-card p-3 shadow-sm">
              <h2 className="text-[13px] font-semibold">PO Actions</h2>
              <div className="mt-3 grid gap-2">
                <Button type="submit" form="purchase-order-form" className="w-full">Create PO</Button>
                <Button type="submit" form="purchase-order-form" variant="outline" className="w-full">Save Draft</Button>
              </div>
            </section>
            <section className="rounded-lg border bg-card p-3 shadow-sm">
              <h2 className="text-[13px] font-semibold">PO Summary</h2>
              <div className="mt-3 grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">PO Number</span><strong>Auto</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Supplier</span><strong>{suppliers.length ? "Required" : "Missing"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Items</span><strong>{items.length}</strong></div>
              </div>
            </section>
          </div>
        }
      >
        <PurchaseOrderForm items={items} suppliers={suppliers} action={createPurchaseOrder} />
      </WorkspaceGrid>
    </>
  );
}
