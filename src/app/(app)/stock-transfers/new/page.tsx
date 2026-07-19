import { StockTransferForm } from "@/components/stock-operation-forms";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { SubmitButton } from "@/components/ui/submit-button";
import { createStockTransfer } from "@/server/actions/stock-operations";
import { getBranchesForSelect } from "@/server/queries/common";
import { getOperationSeedLines } from "@/server/queries/stock-operations";

export default async function NewStockTransferPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const branches = await getBranchesForSelect();
  const selectedFromBranchId = filters.from_branch_id ?? branches[0]?.id;
  const seedLines = await getOperationSeedLines(undefined, selectedFromBranchId);
  const formId = "stock-transfer-create-form";
  return (
    <>
      <PageHeader title="New Stock Transfer" description="Create a draft transfer between branches." />
      <WorkspaceGrid rightRail={<ConsoleSection title="Actions"><SubmitButton form={formId} type="submit" disabled={!seedLines.length} className="w-full" data-mobile-primary-action>Create transfer</SubmitButton></ConsoleSection>}>
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <StockTransferForm formId={formId} showSubmit={false} branches={branches} selectedFromBranchId={selectedFromBranchId} seedLines={seedLines} action={createStockTransfer} />
      </WorkspaceGrid>
    </>
  );
}
