import { StockCountForm } from "@/components/stock-count-form";
import { PageHeader } from "@/components/ui/page-header";
import { createStockCount } from "@/server/actions/stock-counts";
import { getBranchesForSelect, getLocationsForSelect } from "@/server/queries/common";
import { getStockCountSeedLines } from "@/server/queries/stock-counts";

export default async function NewStockCountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const branches = await getBranchesForSelect();
  const selectedBranchId = filters.branch_id ?? branches[0]?.id;
  const [locations, seedLines] = await Promise.all([
    getLocationsForSelect(),
    getStockCountSeedLines(filters.location_id, selectedBranchId),
  ]);
  return (
    <>
      <PageHeader title="New Stock Count" description="Count by branch by default, with optional location-level counting in Advanced." />
      <div className="p-5">
        <StockCountForm branches={branches} locations={locations} selectedBranchId={selectedBranchId} selectedLocationId={filters.location_id} seedLines={seedLines} action={createStockCount} />
      </div>
    </>
  );
}
