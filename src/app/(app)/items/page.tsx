import Link from "next/link";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getItemsWithStockPage } from "@/server/queries/items";
import { getSuppliersForSelect } from "@/server/queries/common";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { getPermissionMap } from "@/server/auth/permissions";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filters = await searchParams;
  const [itemsPage, suppliers, permissions] = await Promise.all([getItemsWithStockPage(filters), getSuppliersForSelect(), getPermissionMap(["items.create", "items.manage"])]);
  const categories = itemsPage.categories;
  const lowStockCount = itemsPage.summary.low_stock;
  const filtered = hasActiveFilters(filters);

  return (
    <>
      <PageHeader title="Items" description="Ingredient and packaging master data. Stock balance is calculated separately." />
      <WorkspaceGrid tabletRailMode="split" tabletRailBreakpoint="md" hideMobileConsole={!permissions["items.create"]} rightRail={<>{permissions["items.create"] || permissions["items.manage"] ? <ConsoleSection title="Actions"><div className="grid gap-2">{permissions["items.create"] ? <><Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/items/new">New item</Link></Button><Button asChild variant="outline" size="sm" className="w-full"><Link href="/imports/items">Import Items</Link></Button></> : null}{permissions["items.manage"] ? <Button asChild variant="outline" size="sm" className="w-full" data-mobile-primary-action={!permissions["items.create"] || undefined}><Link href="/api/export/items">Export CSV</Link></Button> : null}</div></ConsoleSection> : null}<ConsoleSection title="Item Summary"><dl className="grid gap-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Active</dt><dd className="font-semibold">{itemsPage.summary.active}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Inactive</dt><dd className="font-semibold">{itemsPage.summary.inactive}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Low stock</dt><dd className="font-semibold">{lowStockCount}</dd></div></dl></ConsoleSection></>}>
        {filters.success ? <div className="border border-[var(--sb-success)] bg-[var(--sb-success-bg)] p-3 text-sm text-[var(--sb-success)]">{filters.success}</div> : null}
        <div className="rounded-[2px] border bg-card">
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
            showStatus={false}
            leadingFilter={<StatusTabs statuses={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "archived", label: "Archived" }]} activeStatus={filters.status} />}
            showStockFilters
            resultCount={itemsPage.totalRows}
            filtered={filtered}
            resetHref="/items"
          />
          <DataGridHint text="Pro-tip: Double-click any row to open the item." />
          <Table mobileHidden aria-label="Items" stickyColumn="second">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">Action</TableHead>
                <SortableHead wrap className="min-w-20" label="Item Code" column="item_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead wrap className="min-w-20" label="Item Name" column="item_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead className="hidden lg:table-cell" label="Category" column="category" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead wrap className="min-w-20" label="Base Unit" column="base_unit" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Supplier" column="supplier_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} className="hidden lg:table-cell" />
                <SortableHead label="Cost" column="cost" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} className="hidden text-right lg:table-cell" />
                <SortableHead wrap label="Safety Stock" column="safety_stock" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} className="hidden min-w-20 text-right lg:table-cell" />
                <SortableHead wrap label="Current Stock" column="current_stock" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} className="hidden min-w-20 text-right md:table-cell" />
                <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsPage.rows.map((item) => {
                return (
                  <DataGridRow key={item.id} href={`/items/${item.id}`}>
                    <TableCell className="text-center"><TableActionLink href={`/items/${item.id}`} label={`Open ${item.item_name}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                    <TableCell>{item.item_code}</TableCell>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell className="hidden lg:table-cell">{item.category}</TableCell>
                    <TableCell>{item.base_unit}</TableCell>
                    <TableCell className="hidden lg:table-cell">{item.supplier_name ?? "-"}</TableCell>
                    <TableCell className="hidden text-right lg:table-cell">{formatCurrency(item.cost)}</TableCell>
                    <TableCell className="hidden text-right lg:table-cell">{formatNumber(item.safety_stock)} {item.base_unit}</TableCell>
                    <TableCell className="hidden text-right font-medium md:table-cell">{formatNumber(item.current_stock)} {item.base_unit}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "active" ? "success" : "secondary"}>{item.status}</Badge>
                    </TableCell>
                  </DataGridRow>
                );
              })}
              {!itemsPage.rows.length ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <EmptyState title={filtered ? "No records match these filters" : "No items yet"} description={filtered ? "Clear the filters or widen the search." : "Items appear here after they are created or imported."} action={filtered ? { href: "/items", label: "Clear filters" } : undefined} />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <OperationalList ariaLabel="Items">
            {itemsPage.rows.map((item) => <OperationalListRow key={item.id} href={`/items/${item.id}`} label={`Open ${item.item_name}`} primary={item.item_name} status={<Badge variant={item.status === "active" ? "success" : "secondary"}>{item.status}</Badge>} secondary={`${item.item_code} · ${item.category}`} meta={`${formatNumber(item.current_stock)} ${item.base_unit}`} />)}
            {!itemsPage.rows.length ? <EmptyState title={filtered ? "No records match these filters" : "No items yet"} description={filtered ? "Clear the filters or widen the search." : "Items appear here after they are created or imported."} action={filtered ? { href: "/items", label: "Clear filters" } : undefined} /> : null}
          </OperationalList>
          <PaginationControls page={itemsPage.page} totalPages={itemsPage.totalPages} totalRows={itemsPage.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
