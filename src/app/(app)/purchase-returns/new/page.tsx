import { PurchaseReturnForm } from "@/components/purchase-return-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { createPurchaseReturn } from "@/server/actions/purchase-returns";
import { getGoodsReceivingForReturn, getPostedGoodsReceivingsForReturn } from "@/server/queries/purchase-returns";

export default async function NewPurchaseReturnPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const receivings = await getPostedGoodsReceivingsForReturn();
  const selectedReceiving = filters.grn_id ? receivings.find((row) => row.id === filters.grn_id) ?? null : null;
  const selected = selectedReceiving ? await getGoodsReceivingForReturn(selectedReceiving.id) : null;
  const lines = selected?.lines ?? [];
  return (
    <>
      <PageHeader title="New Purchase Return" description="Create a draft supplier return from a posted GRN." />
      <WorkspaceGrid
        rightRail={
          <div>
            <ConsoleSection title="Return Actions">
              <div className="grid gap-2">
                <Button type="submit" form="purchase-return-form" disabled={!selectedReceiving || !lines.length} className="w-full">Create Draft Return</Button>
              </div>
            </ConsoleSection>
            <ConsoleSection title="GRN Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Selected GRN</span><strong>{selectedReceiving?.grn_no ?? "None"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Supplier</span><strong>{selectedReceiving?.supplier_name ?? "-"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Returnable Lines</span><strong>{lines.length}</strong></div>
              </div>
            </ConsoleSection>
          </div>
        }
      >
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <PurchaseReturnForm receivings={receivings} selectedReceiving={selectedReceiving} lines={lines} action={createPurchaseReturn} />
      </WorkspaceGrid>
    </>
  );
}
