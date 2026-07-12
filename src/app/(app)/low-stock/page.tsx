import Link from "next/link";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { SelectNative } from "@/components/ui/select-native";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getBranchesForSelect } from "@/server/queries/common";
import { getLowStockItems } from "@/server/queries/inventory";

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
  const [items, branches] = await Promise.all([getLowStockItems(filters), getBranchesForSelect()]);
  const out = items.filter((item) => item.stock_status === "out_of_stock").length;
  const low = items.filter((item) => item.stock_status === "low_stock").length;

  return (
    <>
      <PageHeader title="Low Stock" description="Branch-level low-stock and out-of-stock items ready for procurement review." />
      <WorkspaceGrid
        rightRail={
          <ConsoleSection title="Low Stock Summary">
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Rows</span><strong>{items.length}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Out of Stock</span><strong>{out}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Low Stock</span><strong>{low}</strong></div>
            </div>
          </ConsoleSection>
        }
      >
        <div className="overflow-hidden rounded-lg border bg-card">
          <form className="flex flex-col gap-3 border-b bg-white p-4 md:flex-row md:items-center">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search item, branch, supplier" className="md:max-w-sm" />
            <SelectNative name="branch_id" defaultValue={filters.branch_id ?? "all"} className="md:max-w-xs">
              <option value="all">All branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
            </SelectNative>
            <SelectNative name="status" defaultValue={filters.status ?? "all"} className="md:max-w-44">
              <option value="all">All statuses</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </SelectNative>
            <Button type="submit" variant="secondary">Filter</Button>
            <Button asChild variant="ghost"><a href="?">Reset</a></Button>
          </form>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Action</TableHead>
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
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <Link href={reorderHref(item)} aria-label={`Create PR for ${item.item_code}`}>
                        <Eye className="h-3.5 w-3.5" />
                        PR
                      </Link>
                    </Button>
                  </TableCell>
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
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No low stock items.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          </div>
        </div>
      </WorkspaceGrid>
    </>
  );
}
