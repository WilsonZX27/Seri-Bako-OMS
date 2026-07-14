import Link from "next/link";
import { Pencil } from "lucide-react";
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
import { Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getItemsWithStock, getItemsWithStockPage } from "@/server/queries/items";
import { getSuppliersForSelect } from "@/server/queries/common";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filters = await searchParams;
  const [itemsPage, allItems, suppliers] = await Promise.all([getItemsWithStockPage(filters), getItemsWithStock(), getSuppliersForSelect()]);
  const categories = Array.from(new Set(allItems.map((item) => item.category))).sort();
  const lowStockCount = allItems.filter((item) => Number(item.current_stock) < Number(item.safety_stock)).length;
  const filtered = hasActiveFilters(filters);

  return (
    <>
      <PageHeader title="Items" description="Ingredient and packaging master data. Stock balance is calculated separately." />
      <WorkspaceGrid rightRail={<><ConsoleSection title="Actions"><div className="grid gap-2"><Button asChild size="sm" className="w-full"><Link href="/items/new">New item</Link></Button><Button asChild variant="outline" size="sm" className="w-full"><Link href="/api/export/items">Export CSV</Link></Button><Button asChild variant="outline" size="sm" className="w-full"><Link href="/imports/items">Import Items</Link></Button></div></ConsoleSection><ConsoleSection title="Item Summary"><dl className="grid gap-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Active</dt><dd className="font-semibold">{allItems.filter((item) => item.status === "active").length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Inactive</dt><dd className="font-semibold">{allItems.filter((item) => item.status === "inactive").length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Low stock</dt><dd className="font-semibold">{lowStockCount}</dd></div></dl></ConsoleSection></>}>
        {filters.success ? <div className="border border-[var(--sb-success)] bg-[var(--sb-success-bg)] p-3 text-sm text-[var(--sb-success)]">{filters.success}</div> : null}
        <div className="overflow-hidden rounded-[2px] border bg-card">
          <StatusTabs statuses={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "archived", label: "Archived" }]} activeStatus={filters.status} />
          <MasterDataFilters
            search={filters.search}
            status={filters.status}
            category={filters.category}
            supplier={filters.supplier}
            stockControl={filters.stock_control}
            lowStock={filters.low_stock}
            placeholder="Search item code, name, category, supplier"
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
                <SortableHead label="Item Code" column="item_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Item Name" column="item_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Category" column="category" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Base Unit" column="base_unit" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Supplier" column="supplier_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Cost" column="cost" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} className="text-right" />
                <SortableHead label="Safety Stock" column="safety_stock" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} className="text-right" />
                <SortableHead label="Current Stock" column="current_stock" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} className="text-right" />
                <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <TableHead className="w-12 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsPage.rows.map((item) => {
                return (
                  <DataGridRow key={item.id} href={`/items/${item.id}`}>
                    <TableCell>
                      <BulkSelectRowCheckbox id={item.id} />
                    </TableCell>
                    <TableCell>{item.item_code}</TableCell>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.base_unit}</TableCell>
                    <TableCell>{item.supplier_name ?? "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.cost)}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.safety_stock)} {item.base_unit}</TableCell>
                    <TableCell className="text-right font-medium">{formatNumber(item.current_stock)} {item.base_unit}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "active" ? "success" : "secondary"}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right"><TableActionLink href={`/items/${item.id}`} label={`Open ${item.item_name}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                  </DataGridRow>
                );
              })}
              {!itemsPage.rows.length ? (
                <TableRow>
                  <TableCell colSpan={11}>
                    <EmptyState
                      title={filtered ? "No records match these filters" : "No items yet"}
                      description={filtered ? "Clear filters or widen the search to see more items." : "Items will appear here after they are created or imported."}
                      action={filtered ? { href: "/items", label: "Clear filters" } : { href: "/items/new", label: "New item" }}
                    />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          </div>
          </BulkSelectionProvider>
          <PaginationControls page={itemsPage.page} totalPages={itemsPage.totalPages} totalRows={itemsPage.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
