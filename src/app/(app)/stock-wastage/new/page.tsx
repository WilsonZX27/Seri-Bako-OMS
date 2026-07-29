import { StockWastageForm } from "@/components/stock-operation-forms";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
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
  return (
    <>
      <PageHeader title="New Stock Wastage" description="Record wastage against branch stock." />
      <WorkspaceGrid documentMode tabletRailMode="split" rightRail={<><ConsoleSection title="Actions"><SubmitButton form={formId} type="submit" disabled={!seedLines.length} className="w-full" data-mobile-primary-action>Create wastage</SubmitButton></ConsoleSection><ConsoleSection title="Evidence"><p className="text-xs text-muted-foreground">Create the draft first, then upload photos or documents from its Attachments panel.</p></ConsoleSection></>}>
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <StockWastageForm formId={formId} showSubmit={false} branches={branches} selectedBranchId={selectedBranchId} seedLines={seedLines} action={createStockWastage} />
      </WorkspaceGrid>
    </>
  );
}
