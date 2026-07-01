import { GoodsReceivingForm } from "@/components/goods-receiving-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createGoodsReceiving } from "@/server/actions/goods-receivings";
import { getBranchesForSelect, getLocationsForSelect } from "@/server/queries/common";
import { getEligiblePurchaseOrders, getPurchaseOrderForReceiving } from "@/server/queries/goods-receivings";

export default async function NewGoodsReceivingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [purchaseOrders, branches, locations] = await Promise.all([getEligiblePurchaseOrders(), getBranchesForSelect(), getLocationsForSelect()]);
  const selectedOrder = filters.po_id ? purchaseOrders.find((order) => order.id === filters.po_id) ?? null : null;
  const receivingPo = selectedOrder ? await getPurchaseOrderForReceiving(selectedOrder.id) : null;
  const lines = receivingPo?.lines.filter((line) => line.pending_qty > 0) ?? [];

  return (
    <>
      <PageHeader title="New Goods Receiving" description="Create a draft GRN from an approved, sent, or partially received PO." />
      <div className="space-y-4 p-5">
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <GoodsReceivingForm
          purchaseOrders={purchaseOrders}
          selectedOrder={selectedOrder}
          lines={lines}
          branches={branches}
          locations={locations}
          action={createGoodsReceiving}
        />
      </div>
    </>
  );
}
