import { StockTransferForm } from "@/components/stock-operation-forms";
import { PageHeader } from "@/components/ui/page-header";
import { createStockTransfer } from "@/server/actions/stock-operations";
import { getBranchesForSelect, getLocationsForSelect } from "@/server/queries/common";
import { getOperationSeedLines } from "@/server/queries/stock-operations";

export default async function NewStockTransferPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [branches, locations, seedLines] = await Promise.all([getBranchesForSelect(), getLocationsForSelect(), getOperationSeedLines(filters.from_location_id)]);
  return <><PageHeader title="New Stock Transfer" description="Create a draft transfer between two inventory locations." /><div className="p-5"><StockTransferForm branches={branches} locations={locations} selectedFromLocationId={filters.from_location_id} seedLines={seedLines} action={createStockTransfer} /></div></>;
}
