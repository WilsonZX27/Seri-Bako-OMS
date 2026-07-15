import { StockCountForm } from "@/components/stock-count-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { SubmitButton } from "@/components/ui/submit-button";
import { createStockCount } from "@/server/actions/stock-counts";
import { getBranchesForSelect } from "@/server/queries/common";
import { getStockCountSeedLines } from "@/server/queries/stock-counts";

export default async function NewStockCountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const branches = await getBranchesForSelect();
  const selectedBranchId = filters.branch_id ?? branches[0]?.id;
  const seedLines = await getStockCountSeedLines(filters.location_id, selectedBranchId);
  const formId = "stock-count-create-form";
  return (
    <>
      <PageHeader title="New Stock Count" description="Count by branch by default, with optional location-level counting in Advanced." />
      <WorkspaceGrid rightRail={<ConsoleSection title="Actions"><SubmitButton form={formId} type="submit" disabled={!seedLines.length} className="w-full" data-mobile-primary-action>Create draft count</SubmitButton></ConsoleSection>}>
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <StockCountForm formId={formId} showSubmit={false} branches={branches} selectedBranchId={selectedBranchId} seedLines={seedLines} action={createStockCount} />
      </WorkspaceGrid>
    </>
  );
}
