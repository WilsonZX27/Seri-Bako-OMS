import { StockCountForm } from "@/components/stock-count-form";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { SubmitButton } from "@/components/ui/submit-button";
import { autosaveNewStockCount, createStockCount } from "@/server/actions/stock-counts";
import { getBranchesForSelect } from "@/server/queries/common";
import { getStockCountSeedLines } from "@/server/queries/stock-counts";

export default async function NewStockCountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const branches = await getBranchesForSelect();
  const selectedBranchId = filters.branch_id ?? branches[0]?.id;
  const seedLines = await getStockCountSeedLines(selectedBranchId);
  const formId = "stock-count-create-form";
  const steps = [
    { key: "draft", label: "Draft", description: "Physical quantities can be entered." },
    { key: "posted", label: "Posted", description: "Stock variance is recorded and locked." },
  ];
  return (
      <DocumentWorkspace
        breadcrumbs={[{ label: "Stock Counts", href: "/stock-counts" }, { label: "New" }]}
        documentNo="New Stock Count"
        title="Stock Count"
        status="draft"
        branch={branches.find((branch) => branch.id === selectedBranchId)?.branch_name}
        mobileStatusOnly
        workflowSteps={steps}
        currentStatus="draft"
        hideMobileWorkflow
        compactMobileSpacing
        sidePanel={<div className="space-y-4">
          <DocumentSideSection title="Primary action">
            <SubmitButton form={formId} className="w-full" pendingLabel="Saving...">Save draft</SubmitButton>
          </DocumentSideSection>
          <DocumentSideSection title="Count guidance"><p className="text-xs text-muted-foreground">Start from the latest posted physical count where available, then use ± or direct entry to record what changed. Variance notes are optional in draft and remain visible for review.</p></DocumentSideSection>
        </div>}
      >
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <StockCountForm formId={formId} branches={branches} selectedBranchId={selectedBranchId} seedLines={seedLines} action={createStockCount} autosaveAction={autosaveNewStockCount} />
      </DocumentWorkspace>
  );
}
