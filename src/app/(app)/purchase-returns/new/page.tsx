import { PurchaseReturnForm } from "@/components/purchase-return-form";
import { ActionErrorNotice } from "@/components/action-error-notice";
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
  const nextStep = !selectedReceiving ? "Select a posted GRN to continue." : !lines.length ? "This receiving has no returnable lines. Choose another GRN." : "Enter the quantities to return before saving.";
  const validationHint = !selectedReceiving || !lines.length ? nextStep : "Return quantity must not exceed the remaining received quantity.";
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
        mobileActionHint={validationHint}
        sidePanel={<>
            <DocumentSideSection title="Primary Action">{primaryAction}</DocumentSideSection>
            <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">{validationHint}</p></DocumentSideSection>
            <DocumentSideSection title="GRN Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Selected GRN</span><strong>{selectedReceiving?.grn_no ?? "None"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Supplier</span><strong>{selectedReceiving?.supplier_name ?? "-"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Returnable Lines</span><strong>{lines.length}</strong></div>
              </div>
            </DocumentSideSection>
          </>}
      >
        <ActionErrorNotice message={filters.error} />
        <PurchaseReturnForm receivings={receivings} selectedReceiving={selectedReceiving} lines={lines} action={createPurchaseReturn} />
      </DocumentWorkspace>
  );
}
