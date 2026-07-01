import { StockCountForm } from "@/components/stock-count-form";
import { PageHeader } from "@/components/ui/page-header";
import { createStockCount } from "@/server/actions/stock-counts";
import { getBranchesForSelect, getLocationsForSelect } from "@/server/queries/common";
import { getStockCountSeedLines } from "@/server/queries/stock-counts";

export default async function NewStockCountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [branches, locations, seedLines] = await Promise.all([
    getBranchesForSelect(),
    getLocationsForSelect(),
    getStockCountSeedLines(filters.location_id),
  ]);
  return (
    <>
      <PageHeader title="New Stock Count" description="Select a location, enter physical quantity, and submit for variance review." />
      <div className="p-5">
        <StockCountForm branches={branches} locations={locations} selectedLocationId={filters.location_id} seedLines={seedLines} action={createStockCount} />
      </div>
    </>
  );
}
