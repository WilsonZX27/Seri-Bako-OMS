import { StockWastageForm } from "@/components/stock-operation-forms";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { SubmitButton } from "@/components/ui/submit-button";
import { createStockWastage } from "@/server/actions/stock-operations";
import { getBranchesForSelect } from "@/server/queries/common";
import { getOperationSeedLines } from "@/server/queries/stock-operations";

export default async function NewStockWastagePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const branches = await getBranchesForSelect();
  const selectedBranchId = filters.branch_id ?? branches[0]?.id;
  const seedLines = await getOperationSeedLines(selectedBranchId);
  const formId = "stock-wastage-create-form";
  const primaryAction = <SubmitButton form={formId} type="submit" disabled={!seedLines.length} className="w-full" data-mobile-primary-action pendingLabel="Saving...">Create wastage</SubmitButton>;
  const steps = [
    { key: "draft", label: "Draft", description: "Wastage is being prepared." },
    { key: "posted", label: "Posted", description: "Stock movement has been recorded." },
  ];
  return (
    <>
      <DocumentWorkspace
        breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Stock Wastage", href: "/stock-wastage" }, { label: "New" }]}
        documentNo="New Stock Wastage"
        title="Stock Wastage"
        status="draft"
        branch={branches.find((branch) => branch.id === selectedBranchId)?.branch_name}
        workflowSteps={steps}
        currentStatus="draft"
        tabletRailMode="split"
        mobilePrimaryAction={primaryAction}
        sidePanel={<>
          <DocumentSideSection title="Primary Action">{primaryAction}</DocumentSideSection>
          <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">Select at least one item and enter a positive quantity. Create the draft first, then upload photos or documents from its Attachments panel.</p></DocumentSideSection>
        </>}
      >
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <StockWastageForm formId={formId} showSubmit={false} branches={branches} selectedBranchId={selectedBranchId} seedLines={seedLines} action={createStockWastage} />
      </DocumentWorkspace>
    </>
  );
}
