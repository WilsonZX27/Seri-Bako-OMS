import { hasPermission } from "@/server/auth/permissions";
import { StockBalanceWorkspace } from "@/components/stock-balance-workspace";
import { getBranchesForSelect, getSuppliersForSelect } from "@/server/queries/common";
import { getStockBalanceDetails, getStockBalanceSummary } from "@/server/queries/inventory";
import { logServerError } from "@/server/observability/logger";

export default async function StockBalancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [branches, balances, hasCreatePr, suppliers, [summaryResult]] = await Promise.all([
    getBranchesForSelect(),
    getStockBalanceDetails({ ...filters, view: "branch" }),
    hasPermission("purchase_request.create"),
    getSuppliersForSelect(),
    Promise.allSettled([getStockBalanceSummary(filters)]),
  ]);
  const queryError = balances.error;
  if (summaryResult.status === "rejected") logServerError(summaryResult.reason, { source: "page.stockBalance.summary" });
  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;

  return (
    <StockBalanceWorkspace
      suppliers={suppliers}
      rows={balances.rows}
      totalValue={summary?.inventoryValue ?? null}
      filters={filters}
      branches={branches}
      totalRows={balances.totalRows}
      totalPages={balances.totalPages}
      page={balances.page}
      summaryTotal={summary?.total ?? null}
      lowStock={summary?.lowStock ?? null}
      negative={summary?.negative ?? null}
      queryError={queryError}
      hasCreatePr={hasCreatePr}
    />
  );
}
