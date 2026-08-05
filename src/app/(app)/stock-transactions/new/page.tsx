import { StockTransactionForm } from "@/components/stock-transaction-form";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { SubmitButton } from "@/components/ui/submit-button";
import { createStockTransaction } from "@/server/actions/stock-transactions";
import { getBranchesForSelect, getItemsForSelect } from "@/server/queries/common";

export default async function NewStockTransactionPage() {
  const [items, branches] = await Promise.all([getItemsForSelect(), getBranchesForSelect()]);
  const formId = "stock-transaction-create-form";

  return (
    <>
      <PageHeader title="New Stock Movement" description="Post a stock movement in the item base unit." />
      <WorkspaceGrid
        documentMode
        tabletRailMode="split"
        rightRail={<ConsoleSection title="Actions"><SubmitButton form={formId} type="submit" className="w-full" data-mobile-primary-action>Post stock transaction</SubmitButton></ConsoleSection>}
      >
        <StockTransactionForm formId={formId} showSubmit={false} items={items} branches={branches} action={createStockTransaction} />
      </WorkspaceGrid>
    </>
  );
}
