import { StockTransactionForm } from "@/components/stock-transaction-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createStockTransaction } from "@/server/actions/stock-transactions";
import { getBranchesForSelect, getItemsForSelect, getLocationsForSelect } from "@/server/queries/common";

export default async function NewStockTransactionPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const [items, branches, locations] = await Promise.all([getItemsForSelect(), getBranchesForSelect(), getLocationsForSelect()]);

  return (
    <>
      <PageHeader title="New Stock Movement" description="Post a stock movement in the item base unit." />
      <div className="space-y-4 p-5">
        {params.error ? <Card><CardContent className="p-4 text-sm text-destructive">{params.error}</CardContent></Card> : null}
        <StockTransactionForm items={items} branches={branches} locations={locations} action={createStockTransaction} />
      </div>
    </>
  );
}
