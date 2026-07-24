import { StockCountForm } from "@/components/stock-count-form";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { createStockCount } from "@/server/actions/stock-counts";
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
    { key: "submitted", label: "Submitted", description: "The count awaits review." },
    { key: "approved", label: "Approved", description: "Verified variance is ready to post." },
    { key: "posted", label: "Posted", description: "Stock variance is recorded and locked." },
  ];
  return (
      <DocumentWorkspace
        breadcrumbs={[{ label: "Stock Counts", href: "/stock-counts" }, { label: "New" }]}
        documentNo="New Stock Count"
        title="Stock Count"
        status="draft"
        branch={branches.find((branch) => branch.id === selectedBranchId)?.branch_name}
        workflowSteps={steps}
        currentStatus="draft"
        sidePanel={<DocumentSideSection title="Count guidance"><p className="text-xs text-muted-foreground">Enter every physical quantity. Variances above tolerance require a line reason before the draft can be created.</p></DocumentSideSection>}
      >
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <StockCountForm formId={formId} branches={branches} selectedBranchId={selectedBranchId} seedLines={seedLines} action={createStockCount} />
      </DocumentWorkspace>
  );
}
