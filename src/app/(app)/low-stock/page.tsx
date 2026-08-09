import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { OperationalList, OperationalListRow, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { SelectControl } from "@/components/ui/select-control";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { hasPermission } from "@/server/auth/permissions";
import { getBranchesForSelect } from "@/server/queries/common";
import { getLowStockItems } from "@/server/queries/inventory";
import { LowStockPrForm } from "@/components/low-stock-pr-form";
import { UnifiedListHeader } from "@/components/common/UnifiedListHeader";

export default async function LowStockPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [items, branches, canCreatePr] = await Promise.all([
    getLowStockItems(filters),
    getBranchesForSelect(),
    hasPermission("purchase_request.create"),
  ]);
  const out = items.filter((item) => item.stock_status === "out_of_stock").length;
  const low = items.filter((item) => item.stock_status === "low_stock").length;
  const filtered = hasActiveFilters(filters);

  return (
    <>
      <PageHeader
        title="Low Stock"
        description="Branch-level low-stock and out-of-stock items ready for procurement review."
      />
      <WorkspaceGrid
        tabletRailMode="split"
        tabletRailBreakpoint="lg"
        hideMobileConsole
        rightRail={
          <ConsoleSection title="Low Stock Summary">
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Rows</span><strong>{items.length}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Out of Stock</span><strong>{out}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Low Stock</span><strong>{low}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Create PR</span><strong>{canCreatePr ? "Allowed" : "Read-only"}</strong></div>
            </div>
          </ConsoleSection>
        }
      >
        <div className="overflow-hidden rounded-[2px] border border-[var(--sb-border-soft)] bg-card">
          <div className="p-4">
            <LowStockPrForm
              items={items}
              branches={branches}
              defaultBranchId={filters.branch_id}
              disabled={!canCreatePr}
            />
          </div>

          <div className="px-4 pb-4">
            <UnifiedListHeader resultCount={items.length} resetHref="/low-stock" filtered={filtered}>
              <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search item, branch, supplier" className="md:max-w-sm" />
              <SelectControl
                name="branch_id"
                defaultValue={filters.branch_id ?? "all"}
                ariaLabel="Branch"
                className="md:max-w-xs"
                options={[{ value: "all", label: "All branches" }, ...branches.map((branch) => ({ value: branch.id, label: branch.branch_name }))]}
              />
              <SelectControl
                name="status"
                defaultValue={filters.status ?? "all"}
                ariaLabel="Stock status"
                className="md:max-w-44"
                options={[{ value: "all", label: "All statuses" }, { value: "low_stock", label: "Low Stock" }, { value: "out_of_stock", label: "Out of Stock" }]}
              />
            </UnifiedListHeader>
          </div>

          <Table mobileHidden aria-label="Low stock items" stickyColumn="first">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Safety</TableHead>
                <TableHead className="text-right">Suggested</TableHead>
                <TableHead className="text-right">MOQ</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={`${item.branch_id ?? "no-branch"}-${item.item_id}`}>
                  <TableCell>{item.item_code}</TableCell>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell>{item.branch_name ?? "-"}</TableCell>
                  <TableCell>{item.supplier_name ?? "-"}</TableCell>
                  <TableCell><Badge variant={item.stock_status === "out_of_stock" ? "danger" : "warning"}>{item.stock_status.replaceAll("_", " ")}</Badge></TableCell>
                  <TableCell className="text-right">{formatNumber(item.current_stock)} {item.base_unit}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.safety_stock)} {item.base_unit}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="warning">{formatNumber(item.suggested_reorder_qty)} {item.purchase_unit || item.base_unit}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(item.moq)} {item.base_unit}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.cost)}</TableCell>
                </TableRow>
              ))}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">No low stock items.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <OperationalList ariaLabel="Low stock items">
            {items.map((item) => {
              const trailing = <span className="text-[11px] font-medium text-[var(--sb-text-muted)]">{canCreatePr ? "Use PR basket" : "Read-only"}</span>;
              return (
                <OperationalListRow
                  key={`${item.branch_id ?? "no-branch"}-${item.item_id}`}
                  label={item.item_name}
                  primary={item.item_name}
                  status={<Badge variant={item.stock_status === "out_of_stock" ? "danger" : "warning"}>{item.stock_status.replaceAll("_", " ")}</Badge>}
                  secondary={`${item.item_code} ${item.branch_name ?? "-"} ${item.supplier_name ?? ""}`}
                  meta={`${formatNumber(item.current_stock)} ${item.base_unit} | ${formatNumber(item.suggested_reorder_qty)} ${item.purchase_unit || item.base_unit}`}
                  trailing={trailing}
                />
              );
            })}
            {!items.length ? <div className="px-3 py-3 text-center text-xs text-muted-foreground">No low stock items.</div> : null}
          </OperationalList>
        </div>
      </WorkspaceGrid>
    </>
  );
}
