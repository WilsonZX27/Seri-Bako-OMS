import { StockTransactionForm } from "@/components/stock-transaction-form";
import { PageHeader } from "@/components/ui/page-header";
import { createStockTransaction } from "@/server/actions/stock-transactions";
import { getItemsForSelect, getLocationsForSelect } from "@/server/queries/common";

export default async function NewStockTransactionPage() {
  const [items, locations] = await Promise.all([getItemsForSelect(), getLocationsForSelect()]);

  return (
    <>
      <PageHeader title="New Stock Movement" description="Post a stock movement in the item base unit." />
      <div className="p-5">
        <StockTransactionForm items={items} locations={locations} action={createStockTransaction} />
      </div>
    </>
  );
}
