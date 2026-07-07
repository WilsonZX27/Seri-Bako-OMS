import { GoodsReceivingForm } from "@/components/goods-receiving-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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
        rightRail={
          <div className="space-y-3">
            <section className="rounded-lg border bg-card p-3 shadow-sm">
              <h2 className="text-[13px] font-semibold">GRN Actions</h2>
              <div className="mt-3 grid gap-2">
                <Button type="submit" form="goods-receiving-form" disabled={!selectedOrder || !lines.length} className="w-full">Create Draft GRN</Button>
                <Button type="submit" form="goods-receiving-form" disabled={!selectedOrder || !lines.length} variant="outline" className="w-full">Save Draft</Button>
              </div>
            </section>
            <section className="rounded-lg border bg-card p-3 shadow-sm">
              <h2 className="text-[13px] font-semibold">PO Summary</h2>
              <div className="mt-3 grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Selected PO</span><strong>{selectedOrder?.po_no ?? "None"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Supplier</span><strong>{selectedOrder?.supplier_name ?? "-"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Pending Lines</span><strong>{lines.length}</strong></div>
              </div>
            </section>
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
      </WorkspaceGrid>
    </>
  );
}
