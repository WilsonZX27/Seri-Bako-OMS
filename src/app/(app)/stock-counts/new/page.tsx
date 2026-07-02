import { StockCountForm } from "@/components/stock-count-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createStockCount } from "@/server/actions/stock-counts";
import { getBranchesForSelect } from "@/server/queries/common";
import { getStockCountSeedLines } from "@/server/queries/stock-counts";

export default async function NewStockCountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const branches = await getBranchesForSelect();
  const selectedBranchId = filters.branch_id ?? branches[0]?.id;
  const seedLines = await getStockCountSeedLines(filters.location_id, selectedBranchId);
  return (
    <>
      <PageHeader title="New Stock Count" description="Count by branch by default, with optional location-level counting in Advanced." />
      <div className="space-y-4 p-5">
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <StockCountForm branches={branches} selectedBranchId={selectedBranchId} seedLines={seedLines} action={createStockCount} />
      </div>
    </>
  );
}
