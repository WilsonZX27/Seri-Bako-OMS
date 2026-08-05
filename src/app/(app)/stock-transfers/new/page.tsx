import { ArrowLeftRight } from "lucide-react";
import { StockTransferForm } from "@/components/stock-operation-forms";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { SubmitButton } from "@/components/ui/submit-button";
import { createStockTransfer } from "@/server/actions/stock-operations";
import { getBranchesForSelect } from "@/server/queries/common";
import { getOperationSeedLines } from "@/server/queries/stock-operations";

export default async function NewStockTransferPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const branches = await getBranchesForSelect();
  const selectedFromBranchId = filters.from_branch_id ?? branches[0]?.id;
  const seedLines = await getOperationSeedLines(selectedFromBranchId);
  const formId = "stock-transfer-create-form";
  const primaryAction = <SubmitButton form={formId} type="submit" disabled={!seedLines.length} className="w-full"><ArrowLeftRight className="h-4 w-4" />Create Transfer</SubmitButton>;
  const steps = [
    { key: "draft", label: "Draft", description: "Branches and quantities can be checked." },
    { key: "in_transit", label: "In Transit", description: "Stock is moving to the destination branch." },
    { key: "completed", label: "Completed", description: "The destination has received the stock." },
  ];
  return (
      <DocumentWorkspace
        breadcrumbs={[{ label: "Stock Transfers", href: "/stock-transfers" }, { label: "New" }]}
        documentNo="New Stock Transfer"
        title="Stock Transfer"
        status="draft"
        branch={branches.find((branch) => branch.id === selectedFromBranchId)?.branch_name}
        workflowSteps={steps}
        currentStatus="draft"
        mobilePrimaryAction={primaryAction}
        sidePanel={<><DocumentSideSection title="Primary Action">{primaryAction}</DocumentSideSection><DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">Choose different source and destination branches and enter at least one positive quantity.</p></DocumentSideSection></>}
      >
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <StockTransferForm formId={formId} showSubmit={false} branches={branches} selectedFromBranchId={selectedFromBranchId} seedLines={seedLines} action={createStockTransfer} />
      </DocumentWorkspace>
  );
}
