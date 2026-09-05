import { hasPermission } from "@/server/auth/permissions";
import { StockBalanceWorkspace } from "@/components/stock-balance-workspace";
import { getBranchesForSelect, getSuppliersForSelect } from "@/server/queries/common";
import { getStockBalanceDetails } from "@/server/queries/inventory";

export default async function StockBalancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [branches, balances, hasCreatePr, suppliers] = await Promise.all([
    getBranchesForSelect(),
    getStockBalanceDetails({ ...filters, view: "branch" }),
    hasPermission("purchase_request.create"),
    getSuppliersForSelect(),
  ]);
  const queryError = balances.error;
  const totalValue = balances.rows.reduce((sum, item) => sum + item.inventory_value, 0);
  const lowStock = balances.rows.filter((item) => item.status === "low_stock").length;
  const negative = balances.rows.filter((item) => item.status === "negative").length;

  return (
    <StockBalanceWorkspace
      suppliers={suppliers}
      rows={balances.rows}
      totalValue={totalValue}
      filters={filters}
      branches={branches}
      totalRows={balances.totalRows}
      totalPages={balances.totalPages}
      page={balances.page}
      lowStock={lowStock}
      negative={negative}
      queryError={queryError}
      hasCreatePr={hasCreatePr}
    />
  );
}
