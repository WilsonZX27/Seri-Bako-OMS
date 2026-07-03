import Link from "next/link";
import { Eye, Package } from "lucide-react";
import { BulkSelectAllCheckbox, BulkSelectionProvider, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getItemsWithStock, getItemsWithStockPage } from "@/server/queries/items";
import { getSuppliersForSelect } from "@/server/queries/common";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filters = await searchParams;
  const [itemsPage, allItems, suppliers] = await Promise.all([getItemsWithStockPage(filters), getItemsWithStock(), getSuppliersForSelect()]);
  const categories = Array.from(new Set(allItems.map((item) => item.category))).sort();

  return (
    <>
      <PageHeader title="Items" description="Ingredient and packaging master data. Stock balance is calculated separately." action={{ href: "/items/new", label: "New item" }} secondaryAction={{ href: "/api/export/items", label: "Export CSV" }} />
      <div className="p-5">
        {filters.success ? <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{filters.success}</div> : null}
        <div className="mb-3 flex justify-end">
          <Button asChild variant="outline" size="sm"><Link href="/imports/items">Import items</Link></Button>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <StatusTabs statuses={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "archived", label: "Archived" }]} activeStatus={filters.status} />
          <MasterDataFilters
            search={filters.search}
            status={filters.status}
            category={filters.category}
            supplier={filters.supplier}
            stockControl={filters.stock_control}
            lowStock={filters.low_stock}
            placeholder="Search item code, name, category, supplier, barcode"
            categories={categories}
            suppliers={suppliers}
            showStockFilters
          />
          <BulkSelectionProvider ids={itemsPage.rows.map((item) => item.id)} actionLabel="Deactivate selected" actionHint="Deactivate items only when they are no longer used in daily operations.">
          <DataGridHint text="Pro-tip: Double-click any row to open the item." />
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16"><BulkSelectAllCheckbox /></TableHead>
                <TableHead>Image</TableHead>
                <SortableHead label="Item Code" column="item_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="AutoCount" column="autocount_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Item Name" column="item_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Category" column="category" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Base Unit" column="base_unit" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Supplier" column="supplier_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <TableHead>Barcode</TableHead>
                <SortableHead label="Cost" column="cost" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} className="text-right" />
                <SortableHead label="Safety Stock" column="safety_stock" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} className="text-right" />
                <SortableHead label="Current Stock" column="current_stock" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} className="text-right" />
                <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsPage.rows.map((item) => {
                return (
                  <DataGridRow key={item.id} href={`/items/${item.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BulkSelectRowCheckbox id={item.id} />
                        <Link href={`/items/${item.id}`} aria-label={`Quick view ${item.item_name}`} className="rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-primary group-hover:opacity-100">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.item_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.item_image_url} alt={item.item_name} className="h-10 w-10 rounded-md border object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-secondary text-muted-foreground">
                          <Package className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{item.item_code}</TableCell>
                    <TableCell>{item.autocount_code ?? "-"}</TableCell>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.base_unit}</TableCell>
                    <TableCell>{item.supplier_name ?? "-"}</TableCell>
                    <TableCell>{item.barcode ?? item.internal_barcode ?? "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.cost)}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.safety_stock)} {item.base_unit}</TableCell>
                    <TableCell className="text-right font-medium">{formatNumber(item.current_stock)} {item.base_unit}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "active" ? "success" : "secondary"}>{item.status}</Badge>
                    </TableCell>
                  </DataGridRow>
                );
              })}
              {!itemsPage.rows.length ? (
                <TableRow>
                  <TableCell colSpan={13}>
                    <EmptyState title="No items found" description="Items will appear here after they are created or imported." action={{ href: "/items/new", label: "New item" }} />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          </div>
          </BulkSelectionProvider>
          <PaginationControls page={itemsPage.page} totalPages={itemsPage.totalPages} totalRows={itemsPage.totalRows} searchParams={filters} />
        </div>
      </div>
    </>
  );
}
