import { StockWastageForm } from "@/components/stock-operation-forms";
import { PageHeader } from "@/components/ui/page-header";
import { createStockWastage } from "@/server/actions/stock-operations";
import { getBranchesForSelect, getLocationsForSelect } from "@/server/queries/common";
import { getOperationSeedLines } from "@/server/queries/stock-operations";

export default async function NewStockWastagePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [branches, locations, seedLines] = await Promise.all([getBranchesForSelect(), getLocationsForSelect(), getOperationSeedLines(filters.location_id)]);
  return <><PageHeader title="New Stock Wastage" description="Record wastage, damage, missing stock, or supplier claim stock loss." /><div className="p-5"><StockWastageForm branches={branches} locations={locations} selectedLocationId={filters.location_id} seedLines={seedLines} action={createStockWastage} /></div></>;
}
