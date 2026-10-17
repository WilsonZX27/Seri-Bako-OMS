import { GoodsReceivingForm } from "@/components/goods-receiving-form";
import { ActionErrorNotice } from "@/components/action-error-notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { createGoodsReceiving } from "@/server/actions/goods-receivings";
import { getBranchesForSelect } from "@/server/queries/common";
import { getEligiblePurchaseOrders, getPurchaseOrderForReceiving } from "@/server/queries/goods-receivings";

export default async function NewGoodsReceivingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [purchaseOrders, branches] = await Promise.all([getEligiblePurchaseOrders(), getBranchesForSelect()]);
  const selectedOrder = filters.po_id ? purchaseOrders.find((order) => order.id === filters.po_id) ?? null : null;
  const receivingPo = selectedOrder ? await getPurchaseOrderForReceiving(selectedOrder.id) : null;
  const lines = receivingPo?.lines.filter((line) => line.pending_qty > 0) ?? [];
  const nextStep = !selectedOrder ? "Select an approved purchase order to continue." : !lines.length ? "This order has no pending quantities. Choose another order." : "Check received and rejected quantities before saving.";
  const validationHint = !selectedOrder || !lines.length ? nextStep : "Received + rejected must not exceed pending quantity.";
  const primaryAction = <SubmitButton type="submit" form="goods-receiving-form" disabled={!selectedOrder || !lines.length} className="w-full" pendingLabel="Saving...">Save receiving draft</SubmitButton>;
  const steps = [
    { key: "draft", label: "Draft", description: "Receiving quantities can be checked." },
    { key: "posted", label: "Posted", description: "Stock movement is recorded and locked." },
  ];

  return (
      <DocumentWorkspace
        breadcrumbs={[{ label: "Goods Receiving", href: "/goods-receivings" }, { label: "New" }]}
        documentNo="New Goods Receiving"
        title="Goods Receiving"
        status="draft"
        branch={branches.find((branch) => branch.id === selectedOrder?.branch_id)?.branch_name}
        workflowSteps={steps}
        currentStatus="draft"
        tabletRailMode="context"
        mobilePrimaryAction={primaryAction}
        mobileActionHint={validationHint}
        sidePanel={<>
            <DocumentSideSection title="Primary Action">{primaryAction}</DocumentSideSection>
            <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">{validationHint}</p></DocumentSideSection>
          </>}
      >
        <ActionErrorNotice message={filters.error} />
        <GoodsReceivingForm
          purchaseOrders={purchaseOrders}
          selectedOrder={selectedOrder}
          lines={lines}
          branches={branches}
          action={createGoodsReceiving}
        />
      </DocumentWorkspace>
  );
}
