import { StockWastageForm } from "@/components/stock-operation-forms";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createStockWastage } from "@/server/actions/stock-operations";
import { getBranchesForSelect, getLocationsForSelect } from "@/server/queries/common";
import { getOperationSeedLines } from "@/server/queries/stock-operations";

export default async function NewStockWastagePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const branches = await getBranchesForSelect();
  const selectedBranchId = filters.branch_id ?? branches[0]?.id;
  const [locations, seedLines] = await Promise.all([getLocationsForSelect(), getOperationSeedLines(filters.location_id, selectedBranchId)]);
  return (
    <>
      <PageHeader title="New Stock Wastage" description="Record branch wastage, with optional location override in Advanced." />
      <div className="space-y-4 p-5">
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <StockWastageForm branches={branches} locations={locations} selectedBranchId={selectedBranchId} selectedLocationId={filters.location_id} seedLines={seedLines} action={createStockWastage} />
      </div>
    </>
  );
}
