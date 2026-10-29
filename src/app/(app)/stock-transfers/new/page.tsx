import { Notice } from "@/components/ui/system-states";
import { canCreateStockDestination } from "@/server/queries/stock-destination-capability";
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
  const [branches,canCreateDestination] = await Promise.all([getBranchesForSelect({ restrictToActorScope: true }),canCreateStockDestination()]);
  const selectedFromBranchId = branches.find((branch) => branch.id === filters.from_branch_id)?.id ?? branches[0]?.id;
  const seedLines = await getOperationSeedLines(selectedFromBranchId);
  const actionHint = branches.length < 2 ? "Access to two different branches is required. Contact an administrator." : !seedLines.length ? "No available branch stock. Choose a source branch with stock." : null;
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
        tabletRailMode="split"
        mobilePrimaryAction={primaryAction}
        mobileActionHint={actionHint}
        sidePanel={<><DocumentSideSection title="Primary Action">{primaryAction}</DocumentSideSection>{actionHint ? <DocumentSideSection title="Next step"><Notice>{actionHint}</Notice></DocumentSideSection> : null}</>}
      >
        <ActionErrorNotice message={filters.error} />
        <StockTransferForm key={selectedFromBranchId ?? "no-branch"} formId={formId} showSubmit={false} canCreateDestination={canCreateDestination} branches={branches} selectedFromBranchId={selectedFromBranchId} seedLines={seedLines} action={createStockTransfer} />
      </DocumentWorkspace>
  );
}
