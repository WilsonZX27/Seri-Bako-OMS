import { ImportWorkflow } from "@/components/imports/import-workflow";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { hasPermission } from "@/server/auth/permissions";

export default async function OpeningStockImportPage() {
  const allowed = (await hasPermission("stock_transactions.create")) || (await hasPermission("company.update"));

  return (
    <>
      <PageHeader
        title="Import Opening Stock"
        description="Post branch opening balances through the stock ledger instead of editing stock directly."
      />
      <div className="p-5">
        {allowed ? (
          <ImportWorkflow entity="opening-stock" />
        ) : (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              You do not have permission to post opening stock.
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
