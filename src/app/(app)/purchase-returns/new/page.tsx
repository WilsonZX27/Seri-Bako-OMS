import { PurchaseReturnForm } from "@/components/purchase-return-form";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { createPurchaseReturn } from "@/server/actions/purchase-returns";
import { getGoodsReceivingForReturn, getPostedGoodsReceivingsForReturn } from "@/server/queries/purchase-returns";

export default async function NewPurchaseReturnPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const receivings = await getPostedGoodsReceivingsForReturn();
  const selectedReceiving = filters.grn_id ? receivings.find((row) => row.id === filters.grn_id) ?? null : null;
  const selected = selectedReceiving ? await getGoodsReceivingForReturn(selectedReceiving.id) : null;
  const lines = selected?.lines ?? [];
  const primaryAction = <SubmitButton type="submit" form="purchase-return-form" disabled={!selectedReceiving || !lines.length} className="w-full" pendingLabel="Creating...">Create Draft Return</SubmitButton>;
  const steps = [
    { key: "draft", label: "Draft", description: "Return details and quantities can be checked." },
    { key: "posted", label: "Posted", description: "Returned stock is recorded and locked." },
  ];
  return (
      <DocumentWorkspace
        breadcrumbs={[{ label: "Purchase Returns", href: "/purchase-returns" }, { label: "New" }]}
        documentNo="New Purchase Return"
        title="Purchase Return"
        status="draft"
        branch={selected?.grn.branch_name}
        workflowSteps={steps}
        currentStatus="draft"
        mobilePrimaryAction={primaryAction}
        sidePanel={<>
            <DocumentSideSection title="Primary Action">{primaryAction}</DocumentSideSection>
            <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">Return quantity cannot exceed the remaining received quantity.</p></DocumentSideSection>
            <DocumentSideSection title="GRN Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Selected GRN</span><strong>{selectedReceiving?.grn_no ?? "None"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Supplier</span><strong>{selectedReceiving?.supplier_name ?? "-"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Returnable Lines</span><strong>{lines.length}</strong></div>
              </div>
            </DocumentSideSection>
          </>}
      >
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <PurchaseReturnForm receivings={receivings} selectedReceiving={selectedReceiving} lines={lines} action={createPurchaseReturn} />
      </DocumentWorkspace>
  );
}
