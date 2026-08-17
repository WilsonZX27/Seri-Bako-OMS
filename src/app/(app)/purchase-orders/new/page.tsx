import { PurchaseOrderForm } from "@/components/procurement-forms";
import { SubmitButton } from "@/components/ui/submit-button";
import { DocumentWorkspace } from "@/components/documents/document-workspace";
import { ConsoleSection } from "@/components/layout/right-console";
import { createPurchaseOrder } from "@/server/actions/procurement";
import { getBranchesForSelect, getBranchSupplierMappingsForSelect, getItemsForSelect } from "@/server/queries/common";
import { ShoppingCart } from "lucide-react";

const poDraftSteps = [
  { key: "draft", label: "Draft", description: "Prepare supplier and order lines." },
  { key: "pending_approval", label: "Approval", description: "Manager reviews the purchase commitment." },
  { key: "approved", label: "Approved", description: "Ready to send to the supplier." },
  { key: "sent", label: "Sent", description: "Supplier has received the order." },
  { key: "partial_received", label: "Receiving", description: "Some ordered goods have arrived." },
  { key: "received", label: "Received", description: "All ordered goods have arrived." },
];

export default async function NewPurchaseOrderPage() {
  const [items, branches, supplierMappings] = await Promise.all([getItemsForSelect(), getBranchesForSelect(), getBranchSupplierMappingsForSelect()]);
  const createAction = <SubmitButton type="submit" form="purchase-order-form" className="w-full" pendingLabel="Creating..." data-mobile-primary-action><ShoppingCart className="h-4 w-4" />Create Draft PO</SubmitButton>;
  return (
      <DocumentWorkspace
        breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Purchase Orders", href: "/purchase-orders" }, { label: "New Purchase Order" }]}
        documentNo="New Purchase Order"
        title="New Purchase Order"
        status="draft"
        workflowSteps={poDraftSteps}
        currentStatus="draft"
        mobilePrimaryAction={createAction}
        tabletRailMode="split"
        sidePanel={
          <div>
            <ConsoleSection title="PO Actions">
              <div className="grid gap-2">
                {createAction}
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
      </DocumentWorkspace>
  );
}
