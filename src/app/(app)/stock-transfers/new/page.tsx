import { StockTransferForm } from "@/components/stock-operation-forms";
import { PageHeader } from "@/components/ui/page-header";
import { createStockTransfer } from "@/server/actions/stock-operations";
import { getBranchesForSelect, getLocationsForSelect } from "@/server/queries/common";
import { getOperationSeedLines } from "@/server/queries/stock-operations";

export default async function NewStockTransferPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const branches = await getBranchesForSelect();
  const selectedFromBranchId = filters.from_branch_id ?? branches[0]?.id;
  const [locations, seedLines] = await Promise.all([getLocationsForSelect(), getOperationSeedLines(filters.from_location_id, selectedFromBranchId)]);
  return <><PageHeader title="New Stock Transfer" description="Create a draft transfer between branches, with optional location overrides in Advanced." /><div className="p-5"><StockTransferForm branches={branches} locations={locations} selectedFromBranchId={selectedFromBranchId} selectedFromLocationId={filters.from_location_id} seedLines={seedLines} action={createStockTransfer} /></div></>;
}
