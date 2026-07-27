import { ImportWorkflow } from "@/components/imports/import-workflow";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Notice } from "@/components/ui/system-states";
import { formatPageError } from "@/server/actions/error-handling";
import { hasPermission } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export default async function OpeningStockImportPage() {
  try {
    const allowed = (await hasPermission("stock_transactions.create")) || (await hasPermission("company.update"));

    return (
      <>
        <PageHeader
          title="Import Opening Stock"
          description="Post branch opening balances through the Movement Ledger instead of editing stock directly."
        />
        {allowed ? <ImportWorkflow entity="opening-stock" /> : <WorkspaceGrid tabletCanvas="contained"><Notice tone="error" title="Permission required">You do not have permission to post opening stock.</Notice></WorkspaceGrid>}
      </>
    );
  } catch (error) {
    console.error(error);
    return (
      <>
        <PageHeader title="Import Opening Stock" description="Post branch opening balances through the Movement Ledger instead of editing stock directly." />
        <WorkspaceGrid tabletCanvas="contained"><Notice tone="error" title="Import unavailable">{formatPageError(error, "This import workspace is unavailable right now. Please try again shortly.")}</Notice></WorkspaceGrid>
      </>
    );
  }
}
