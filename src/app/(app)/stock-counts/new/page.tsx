import { StockCountForm } from "@/components/stock-count-form";
import { ActionErrorNotice } from "@/components/action-error-notice";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { SubmitButton } from "@/components/ui/submit-button";
import { autosaveNewStockCount, createStockCount, updateStockCountDraft } from "@/server/actions/stock-counts";
import { getBranchesForSelect, getItemsForSelect } from "@/server/queries/common";
import { getStockCountSeedLines } from "@/server/queries/stock-counts";
import { logServerError } from "@/server/observability/logger";

export default async function NewStockCountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  let branches: Awaited<ReturnType<typeof getBranchesForSelect>> = [];
  let selectedBranchId = filters.branch_id;
  let seedLines: Awaited<ReturnType<typeof getStockCountSeedLines>> = [];
  let items: Awaited<ReturnType<typeof getItemsForSelect>> = [];
  let sourceUnavailable = false;
  try {
    [branches, items] = await Promise.all([getBranchesForSelect(), getItemsForSelect()]);
    selectedBranchId = selectedBranchId ?? branches[0]?.id;
    if (!selectedBranchId) throw new Error("No active branch is available for this Stock Count.");
    seedLines = await getStockCountSeedLines(selectedBranchId);
  } catch (error) {
    sourceUnavailable = true;
    logServerError(error, { source: "page.stockCounts.new.source" });
  }
  const formId = "stock-count-create-form";
  return (
      <DocumentWorkspace
        breadcrumbs={[{ label: "Stock Counts", href: "/stock-counts" }, { label: "New" }]}
        documentNo="New Stock Count"
        title="Stock Count"
        status="draft"
        branch={branches.find((branch) => branch.id === selectedBranchId)?.branch_name}
        hideWorkflow
        hideMobileHeader
        compactMobileSpacing
        sidePanel={<div className="space-y-4">
          {sourceUnavailable ? null : <DocumentSideSection title="Primary action">
            <SubmitButton form={formId} className="w-full" pendingLabel="Saving...">Save draft</SubmitButton>
          </DocumentSideSection>}
          <DocumentSideSection title="Count guidance"><p className="text-xs text-muted-foreground">Start from the latest posted physical count where available, then use ± or direct entry to record what changed. Variance notes are optional in draft and remain visible for review.</p></DocumentSideSection>
        </div>}
      >
        <ActionErrorNotice message={filters.error} />
        {sourceUnavailable ? <Card role="status"><CardContent className="p-5"><EmptyState title="Starting balances unavailable" description="Verified branch balances could not be loaded. Retry before entering a count; no zero values have been substituted." action={{ href: filters.branch_id ? `/stock-counts/new?branch_id=${encodeURIComponent(filters.branch_id)}` : "/stock-counts/new", label: "Retry" }} /></CardContent></Card> : <StockCountForm formId={formId} branches={branches} selectedBranchId={selectedBranchId} seedLines={seedLines} action={createStockCount} updateDraftAction={updateStockCountDraft} autosaveAction={autosaveNewStockCount} itemCatalog={items} allowAddItem />}
      </DocumentWorkspace>
  );
}
