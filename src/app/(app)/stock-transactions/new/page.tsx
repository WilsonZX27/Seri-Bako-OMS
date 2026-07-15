import { StockTransactionForm } from "@/components/stock-transaction-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { SubmitButton } from "@/components/ui/submit-button";
import { createStockTransaction } from "@/server/actions/stock-transactions";
import { getBranchesForSelect, getItemsForSelect, getLocationsForSelect } from "@/server/queries/common";

export default async function NewStockTransactionPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const [items, branches, locations] = await Promise.all([getItemsForSelect(), getBranchesForSelect(), getLocationsForSelect()]);
  const formId = "stock-transaction-create-form";

  return (
    <>
      <PageHeader title="New Stock Movement" description="Post a stock movement in the item base unit." />
      <WorkspaceGrid rightRail={<ConsoleSection title="Actions"><SubmitButton form={formId} type="submit" className="w-full" data-mobile-primary-action>Post stock transaction</SubmitButton></ConsoleSection>}>
        {params.error ? <Card><CardContent className="p-4 text-sm text-destructive">{params.error}</CardContent></Card> : null}
        <StockTransactionForm formId={formId} showSubmit={false} items={items} branches={branches} locations={locations} action={createStockTransaction} />
      </WorkspaceGrid>
    </>
  );
}
