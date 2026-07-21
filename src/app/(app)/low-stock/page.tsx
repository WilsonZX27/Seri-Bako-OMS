import Link from "next/link";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { OperationalList, OperationalListRow, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { SelectControl } from "@/components/ui/select-control";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { hasPermission } from "@/server/auth/permissions";
import { getBranchesForSelect } from "@/server/queries/common";
import { getLowStockItems } from "@/server/queries/inventory";
import { LowStockPrForm } from "@/components/low-stock-pr-form";

function reorderHref(item: Awaited<ReturnType<typeof getLowStockItems>>[number]) {
  const params = new URLSearchParams({
    source: "low-stock",
    branch_id: item.branch_id ?? "",
    item_id: item.item_id,
    qty: String(item.suggested_reorder_qty),
    uom: item.purchase_unit || item.base_unit,
    supplier_id: item.supplier_id ?? "",
    notes: `Created from Low Stock Sprint 7.2.30 - ${item.item_code} at ${item.branch_name ?? "branch"}`,
  });
  return `/purchase-requests/new?${params.toString()}`;
}

export default async function LowStockPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [items, branches, canCreatePr] = await Promise.all([
    getLowStockItems(filters),
    getBranchesForSelect(),
    hasPermission("purchase_request.create"),
  ]);
  const out = items.filter((item) => item.stock_status === "out_of_stock").length;
  const low = items.filter((item) => item.stock_status === "low_stock").length;

  return (
    <>
      <PageHeader
        title="Low Stock"
        description="Branch-level low-stock and out-of-stock items ready for procurement review."
      />
      <WorkspaceGrid
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
            <form className="sb-list-filters">
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
              <Button type="submit" variant="secondary">Filter</Button>
              <Button asChild variant="ghost"><a href="?">Reset</a></Button>
            </form>
          </div>

          <Table mobileHidden aria-label="Low stock items">
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
                <TableHead className="w-16 text-right">Action</TableHead>
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
                  <TableCell className="text-right">
                    {canCreatePr ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={reorderHref(item)} aria-label={`Create PR for ${item.item_code}`}>
                          <Pencil className="h-3.5 w-3.5" />PR
                        </Link>
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground">No low stock items.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <OperationalList ariaLabel="Low stock items">
            {items.map((item) => {
              const href = canCreatePr ? reorderHref(item) : "/low-stock";
              const trailing = canCreatePr ? undefined : <span className="text-xs text-muted-foreground">Read-only</span>;
              return (
                <OperationalListRow
                  key={`${item.branch_id ?? "no-branch"}-${item.item_id}`}
                  href={href}
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
