import { GoodsReceivingForm } from "@/components/goods-receiving-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { createGoodsReceiving } from "@/server/actions/goods-receivings";
import { getBranchesForSelect } from "@/server/queries/common";
import { getEligiblePurchaseOrders, getPurchaseOrderForReceiving } from "@/server/queries/goods-receivings";

export default async function NewGoodsReceivingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [purchaseOrders, branches] = await Promise.all([getEligiblePurchaseOrders(), getBranchesForSelect()]);
  const selectedOrder = filters.po_id ? purchaseOrders.find((order) => order.id === filters.po_id) ?? null : null;
  const receivingPo = selectedOrder ? await getPurchaseOrderForReceiving(selectedOrder.id) : null;
  const lines = receivingPo?.lines.filter((line) => line.pending_qty > 0) ?? [];

  return (
    <>
      <PageHeader title="New Goods Receiving" description="Create a draft GRN from an approved, sent, or partially received PO." />
      <WorkspaceGrid
        hideMobileConsole
        className="pb-20 xl:pb-3"
        rightRail={
          <div>
            <ConsoleSection title="GRN Actions">
              <div className="grid gap-2">
                <div data-mobile-primary-action><Button type="submit" form="goods-receiving-form" disabled={!selectedOrder || !lines.length} className="w-full">Record Receiving &amp; Attach DO</Button></div>
              </div>
            </ConsoleSection>
            <ConsoleSection title="PO Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Selected PO</span><strong>{selectedOrder?.po_no ?? "None"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Supplier</span><strong>{selectedOrder?.supplier_name ?? "-"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Pending Lines</span><strong>{lines.length}</strong></div>
              </div>
            </ConsoleSection>
          </div>
        }
      >
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <GoodsReceivingForm
          purchaseOrders={purchaseOrders}
          selectedOrder={selectedOrder}
          lines={lines}
          branches={branches}
          action={createGoodsReceiving}
        />
        <div data-inline-form-actions className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-40 border bg-background p-2 shadow-sm xl:hidden"><Button type="submit" form="goods-receiving-form" disabled={!selectedOrder || !lines.length} className="w-full">Record Receiving &amp; Attach DO</Button></div>
      </WorkspaceGrid>
    </>
  );
}
