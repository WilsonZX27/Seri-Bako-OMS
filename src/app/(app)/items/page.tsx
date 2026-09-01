import { Pencil, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { getItemsWithStockPage, getRetiredBranchStockCountItems } from "@/server/queries/items";
import { restoreBranchStockCountItem } from "@/server/actions/items";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { getSuppliersForSelect } from "@/server/queries/common";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleActionLink } from "@/components/layout/console-action-link";
import { getPermissionMap } from "@/server/auth/permissions";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filters = await searchParams;
  const showRetired = filters.status === "retired";
  const [itemsPage, retiredScopes, suppliers, permissions] = await Promise.all([getItemsWithStockPage(showRetired ? { ...filters, status: "all" } : filters), getRetiredBranchStockCountItems(), getSuppliersForSelect(), getPermissionMap(["items.create", "items.manage", "stock_count.update"])]);
  const lowStockCount = itemsPage.summary.low_stock;
  const filtered = hasActiveFilters(filters);

  return (
    <>
      <PageHeader title="Items" description="Ingredient and packaging master data. Stock balance is calculated separately." />
      <WorkspaceGrid tabletRailMode="split" tabletRailBreakpoint="md" hideMobileConsole={!permissions["items.create"]} rightRail={<>{permissions["items.create"] || permissions["items.manage"] ? <ConsoleSection title="Actions"><div className="grid gap-2">{permissions["items.create"] ? <><ConsoleActionLink href="/items/new" kind="create" primary>New item</ConsoleActionLink><ConsoleActionLink href="/imports/items" kind="import">Import items</ConsoleActionLink></> : null}{permissions["items.manage"] ? <ConsoleActionLink href="/api/export/items" kind="export" primary={!permissions["items.create"]}>Export CSV</ConsoleActionLink> : null}</div></ConsoleSection> : null}<ConsoleSection title="Item Summary"><dl className="grid gap-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Active</dt><dd className="font-semibold">{itemsPage.summary.active}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Inactive</dt><dd className="font-semibold">{itemsPage.summary.inactive}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Low stock</dt><dd className="font-semibold">{lowStockCount}</dd></div></dl></ConsoleSection></>}>
        {filters.success ? <div className="border border-[var(--sb-success)] bg-[var(--sb-success-bg)] p-3 text-sm text-[var(--sb-success)]">{filters.success}</div> : null}
        <div className="space-y-3">
          <MasterDataFilters
            search={filters.search}
            status={filters.status}
            category={undefined}
            supplier={filters.supplier}
            stockControl={filters.stock_control}
            lowStock={filters.low_stock}
            placeholder="Search item code, name, brand, supplier"
            categories={[]}
            suppliers={suppliers}
            showStatus={false}
            leadingFilter={<StatusTabs name="status" statuses={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "archived", label: "Archived" }, { value: "retired", label: "Retired from counts" }]} activeStatus={filters.status} />}
            showStockFilters
            resultCount={itemsPage.totalRows}
            filtered={filtered}
            resetHref="/items"
          />
          {showRetired ? <div className="sb-list-content-card overflow-hidden"><div className="border-b px-3 py-3"><h2 className="text-sm font-semibold">Retired from branch Stock Counts</h2><p className="mt-0.5 text-xs text-muted-foreground">These items remain in Item Master and inventory history. Restore one to include it in that branch&apos;s next count.</p></div><div className="divide-y divide-[var(--sb-border-soft)]">{retiredScopes.map((scope) => { const item = Array.isArray(scope.item) ? scope.item[0] : scope.item; const branch = Array.isArray(scope.branch) ? scope.branch[0] : scope.branch; return <div key={scope.id} className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,auto)] lg:items-center"><div><p className="text-sm font-semibold">{item?.item_code} · {item?.item_name}</p><p className="mt-1 text-xs text-muted-foreground">{branch?.branch_name ?? "Assigned branch"}{scope.last_physical_qty != null ? ` · final count ${scope.last_physical_qty} ${item?.base_unit ?? ""}` : ""}</p>{scope.retirement_note ? <p className="mt-1 text-xs text-muted-foreground">{scope.retirement_note}</p> : null}</div>{permissions["stock_count.update"] ? <form action={restoreBranchStockCountItem.bind(null, scope.item_id, scope.id)} className="flex min-w-0 gap-2"><Input name="reason" minLength={3} maxLength={1000} required placeholder="Reason for restoring" className="min-w-0" /><SubmitButton variant="outline" pendingLabel="Restoring..."><RotateCcw className="h-4 w-4" />Unretire</SubmitButton></form> : null}</div>; })}{!retiredScopes.length ? <EmptyState title="No retired items" description="No branch-level Stock Count retirements match this filter." /> : null}</div></div> : <div className="sb-list-content-card overflow-hidden">
          <DataGridHint text="Pro-tip: Double-click any row to open the item." />
          <Table mobileHidden aria-label="Items" stickyColumn="second">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">Action</TableHead>
                <SortableHead wrap className="min-w-20" label="Item Code" column="item_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead wrap className="min-w-20" label="Item Name" column="item_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
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
                    <TableCell className="font-medium"><span className="block">{item.item_name}</span>{item.brand_name ? <span className="block text-xs font-normal text-muted-foreground">{item.brand_name}</span> : null}</TableCell>
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
            {itemsPage.rows.map((item) => <OperationalListRow key={item.id} href={`/items/${item.id}`} label={`Open ${item.item_name}`} primary={item.item_name} status={<Badge variant={item.status === "active" ? "success" : "secondary"}>{item.status}</Badge>} secondary={`${item.item_code}${item.brand_name ? ` · ${item.brand_name}` : ""}`} meta={`${formatNumber(item.current_stock)} ${item.base_unit}`} />)}
            {!itemsPage.rows.length ? <EmptyState title={filtered ? "No records match these filters" : "No items yet"} description={filtered ? "Clear the filters or widen the search." : "Items appear here after they are created or imported."} action={filtered ? { href: "/items", label: "Clear filters" } : undefined} /> : null}
          </OperationalList>
          <PaginationControls page={itemsPage.page} totalPages={itemsPage.totalPages} totalRows={itemsPage.totalRows} searchParams={filters} />
          </div>}
        </div>
      </WorkspaceGrid>
    </>
  );
}
