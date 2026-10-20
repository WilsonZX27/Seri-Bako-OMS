import { uomOptionsWithCurrent } from "@/lib/uom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { OperationalList, OperationalListRow, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { SelectControl } from "@/components/ui/select-control";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getReplenishmentDecision } from "@/lib/replenishment-decision";
import { hasPermission } from "@/server/auth/permissions";
import { getBranchesForSelect } from "@/server/queries/common";
import { getLowStockResult } from "@/server/queries/inventory";
import { LowStockPrForm } from "@/components/low-stock-pr-form";
import { UnifiedListHeader } from "@/components/common/UnifiedListHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { Barcode, MapPin, Truck } from "lucide-react";

export default async function LowStockPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [lowStockResult, branches, canCreatePr] = await Promise.all([
    getLowStockResult(filters),
    getBranchesForSelect(),
    hasPermission("purchase_request.create"),
  ]);
  const { rows: items, count, unavailable } = lowStockResult;
  const out = items.filter((item) => item.stock_status === "out_of_stock").length;
  const low = items.filter((item) => item.stock_status === "low_stock").length;
  const decisions = items.map((item) => getReplenishmentDecision({
    currentStock: Number(item.current_qty ?? item.current_stock ?? 0),
    safetyStock: Number(item.safety_stock ?? 0),
    suggestedReorderQty: Number(item.suggested_reorder_qty ?? 0),
    stockStatus: item.stock_status,
    supplierId: item.supplier_id,
    supplierName: item.supplier_name,
    baseUnit: item.base_unit,
  }));
  const buyNow = decisions.filter((decision) => decision.decision === "buy_now").length;
  const supplierFixes = decisions.filter((decision) => decision.decision === "fix_supplier").length;
  const filtered = hasActiveFilters(filters);

  return (
    <>
      <PageHeader
        title="Low Stock"
        description="Branch-level low-stock and out-of-stock items ready for procurement review."
      />
      <WorkspaceGrid
        className="pb-24 xl:pb-0"
        tabletRailMode="split"
        tabletRailBreakpoint="lg"
        hideMobileConsole
        rightRail={
          <ConsoleSection title="Low Stock Summary">
            <div className="grid gap-2 text-xs" data-low-stock-decision-summary>
              <div className="flex justify-between"><span className="text-muted-foreground">Rows</span><strong>{unavailable ? "Unavailable" : count}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Out of Stock</span><strong>{unavailable ? "-" : out}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Low Stock</span><strong>{unavailable ? "-" : low}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Buy now</span><strong>{unavailable ? "Unavailable" : buyNow}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Supplier fixes</span><strong>{unavailable ? "Unavailable" : supplierFixes}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Create PR</span><strong>{canCreatePr ? "Allowed" : "Read-only"}</strong></div>
            </div>
          </ConsoleSection>
        }
      >
        <div className="min-w-0 max-w-full space-y-3 overflow-x-clip" data-low-stock-workspace>
          <div>
            {unavailable ? <p role="status" className="erp-surface p-3 text-sm">Replenishment is unavailable until stock data can be confirmed.</p> : <LowStockPrForm
              items={items}
              branches={branches}
              defaultBranchId={filters.branch_id}
              disabled={!canCreatePr}
            />}
          </div>

          <div>
            <UnifiedListHeader resultCount={unavailable ? undefined : count ?? undefined} resetHref="/low-stock" filtered={filtered}>
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
              <Input name="below_qty" type="number" min="0" step="any" defaultValue={filters.below_qty ?? ""} placeholder="Quantity below" aria-label="Current quantity below" className="md:max-w-40" />
              <SelectControl name="quantity_uom" defaultValue={filters.quantity_uom ?? "KG"} ariaLabel="Threshold base UOM" className="md:max-w-28" options={uomOptionsWithCurrent(filters.quantity_uom ?? "KG").map(unit => ({ value: unit, label: unit }))} />
            </UnifiedListHeader>
          </div>

          <div className="sb-list-content-card overflow-hidden">
          <Table mobileHidden aria-label="Low stock items" stickyColumn="first">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Safety</TableHead>
                <TableHead className="text-right">Suggested</TableHead>
                <TableHead className="text-right">MOQ</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const decision = getReplenishmentDecision({
                  currentStock: Number(item.current_qty ?? item.current_stock ?? 0),
                  safetyStock: Number(item.safety_stock ?? 0),
                  suggestedReorderQty: Number(item.suggested_reorder_qty ?? 0),
                  stockStatus: item.stock_status,
                  supplierId: item.supplier_id,
                  supplierName: item.supplier_name,
                  baseUnit: item.base_unit,
                });
                return (
                  <TableRow key={`${item.branch_id ?? "no-branch"}-${item.item_id}`}>
                    <TableCell><span className="sb-item-code" title={item.item_code ?? undefined}>{item.item_code}</span></TableCell>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell>{item.branch_name ?? "-"}</TableCell>
                    <TableCell>{item.supplier_name ?? "-"}</TableCell>
                    <TableCell><Badge variant={item.stock_status === "out_of_stock" ? "danger" : "warning"}>{item.stock_status.replaceAll("_", " ")}</Badge></TableCell>
                    <TableCell><Badge variant={decision.decision === "buy_now" ? "warning" : decision.blocked ? "danger" : "secondary"} title={decision.reason} aria-label={`${decision.label}: ${decision.reason}`} data-low-stock-decision={decision.decision}>{decision.label}</Badge></TableCell>
                    <TableCell className="text-right">{formatNumber(item.current_stock)} {item.base_unit}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.safety_stock)} {item.base_unit}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="warning">{formatNumber(item.suggested_reorder_qty)} {item.purchase_unit || item.base_unit}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(item.moq)} {item.base_unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.cost)}</TableCell>
                  </TableRow>
                );
              })}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={11}><EmptyState title={unavailable ? "Low stock is unavailable" : filtered ? "No items match these filters" : "Stock levels are healthy"} description={unavailable ? "The inventory summary could not be confirmed. Try again shortly." : filtered ? "Reset the filters or search for another item." : "Items that need replenishment will appear here."} action={filtered && !unavailable ? { href: "/low-stock", label: "Reset filters" } : undefined} /></TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <OperationalList ariaLabel="Low stock items">
            {items.map((item) => {
              const rowKey = `${item.branch_id ?? "no-branch"}-${item.item_id}`;
              return (
                <OperationalListRow
                  key={rowKey}
                  label={item.item_name}
                  primary={item.item_name}
                  status={<Badge variant={item.stock_status === "out_of_stock" ? "danger" : "warning"}>{item.stock_status.replaceAll("_", " ")}</Badge>}
                  secondary={<span className="mt-1 grid min-w-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.3fr)] gap-x-2 text-[11px] leading-4 text-muted-foreground"><span className="inline-flex min-w-0 items-center gap-1"><Barcode aria-hidden="true" className="size-3 shrink-0"/><span className="truncate" title={item.item_code}>{item.item_code}</span></span><span className="inline-flex min-w-0 items-center gap-1"><MapPin aria-hidden="true" className="size-3 shrink-0"/><span className="truncate" title={item.branch_name ?? "No branch"}>{item.branch_name ?? "—"}</span></span><span className="inline-flex min-w-0 items-center gap-1"><Truck aria-hidden="true" className="size-3 shrink-0"/><span className="truncate" title={item.supplier_name ?? "Supplier not assigned"}>{item.supplier_name ?? "Supplier not assigned"}</span></span></span>}
                  detail={`Current: ${formatNumber(item.current_stock)} ${item.base_unit} · Suggested: ${formatNumber(item.suggested_reorder_qty)} ${item.purchase_unit || item.base_unit}`}
                />
              );
            })}
            {!items.length ? <EmptyState title={unavailable ? "Low stock is unavailable" : filtered ? "No items match these filters" : "Stock levels are healthy"} description={unavailable ? "The inventory summary could not be confirmed. Try again shortly." : filtered ? "Reset the filters or search for another item." : "Items that need replenishment will appear here."} action={filtered && !unavailable ? { href: "/low-stock", label: "Reset filters" } : undefined} /> : null}
          </OperationalList>
          </div>
        </div>
      </WorkspaceGrid>
    </>
  );
}
