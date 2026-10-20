import { ArrowLeftRight } from "lucide-react";
import { StockTransferForm } from "@/components/stock-operation-forms";
import { ActionErrorNotice } from "@/components/action-error-notice";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { SubmitButton } from "@/components/ui/submit-button";
import { createStockTransfer } from "@/server/actions/stock-operations";
import { getBranchesForSelect } from "@/server/queries/common";
import { getOperationSeedLines } from "@/server/queries/stock-operations";

export default async function NewStockTransferPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const branches = await getBranchesForSelect({ restrictToActorScope: true });
  const selectedFromBranchId = branches.find((branch) => branch.id === filters.from_branch_id)?.id ?? branches[0]?.id;
  const seedLines = await getOperationSeedLines(selectedFromBranchId);
  const actionHint = branches.length < 2 ? "Access to two different branches is required. Contact an administrator." : !seedLines.length ? "No available branch stock. Choose a source branch with stock." : "Choose different branches and enter at least one positive quantity.";
  const formId = "stock-transfer-create-form";
  const primaryAction = <SubmitButton form={formId} type="submit" disabled={!seedLines.length || branches.length < 2} className="w-full"><ArrowLeftRight className="h-4 w-4" />Save Transfer Draft</SubmitButton>;
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
        mobileActionHint={actionHint}
        sidePanel={<><DocumentSideSection title="Primary Action">{primaryAction}</DocumentSideSection><DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">{actionHint}</p></DocumentSideSection></>}
      >
        <ActionErrorNotice message={filters.error} />
        <StockTransferForm key={selectedFromBranchId ?? "no-branch"} formId={formId} showSubmit={false} branches={branches} selectedFromBranchId={selectedFromBranchId} seedLines={seedLines} action={createStockTransfer} />
      </DocumentWorkspace>
  );
}
