import { StockTransactionForm } from "@/components/stock-transaction-form";
import { PageHeader } from "@/components/ui/page-header";
import { createStockTransaction } from "@/server/actions/stock-transactions";
import { getBranchesForSelect, getItemsForSelect, getLocationsForSelect } from "@/server/queries/common";

export default async function NewStockTransactionPage() {
  const [items, branches, locations] = await Promise.all([getItemsForSelect(), getBranchesForSelect(), getLocationsForSelect()]);

  return (
    <>
      <PageHeader title="New Stock Movement" description="Post a stock movement in the item base unit." />
      <div className="p-5">
        <StockTransactionForm items={items} branches={branches} locations={locations} action={createStockTransaction} />
      </div>
    </>
  );
}
