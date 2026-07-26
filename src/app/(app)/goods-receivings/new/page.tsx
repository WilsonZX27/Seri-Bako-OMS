import { GoodsReceivingForm } from "@/components/goods-receiving-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const primaryAction = <Button type="submit" form="goods-receiving-form" disabled={!selectedOrder || !lines.length} className="w-full">Save receiving draft</Button>;
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
        mobilePrimaryAction={primaryAction}
        sidePanel={<>
            <DocumentSideSection title="Primary Action">{primaryAction}</DocumentSideSection>
            <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">Received plus rejected quantity cannot exceed the pending PO quantity. Attach the Delivery Order on the saved GRN before posting.</p></DocumentSideSection>
            <DocumentSideSection title="PO Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Selected PO</span><strong>{selectedOrder?.po_no ?? "None"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Supplier</span><strong>{selectedOrder?.supplier_name ?? "-"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Pending Lines</span><strong>{lines.length}</strong></div>
              </div>
            </DocumentSideSection>
          </>}
      >
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
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
