import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { OperationalList, OperationalListRow, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableActionMenuPortal } from "@/components/ui/table-action-menu-portal";
import { hasActiveFilters, paginateRows } from "@/lib/table-state";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { deleteSupplierItem } from "@/server/actions/master-data";
import { getPermissionMap } from "@/server/auth/permissions";
import { getSupplierItems } from "@/server/queries/master-data";
import { getSuppliersForSelect } from "@/server/queries/common";

export default async function SupplierItemsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [rows, permissions, suppliers] = await Promise.all([getSupplierItems(filters), getPermissionMap(["supplier_items.create", "supplier_items.update", "imports.run"]), getSuppliersForSelect()]);
  const page = paginateRows(rows, filters.page);
  const filtered = hasActiveFilters(filters);
  const canCreate = permissions["supplier_items.create"];
  const canUpdate = permissions["supplier_items.update"];
  const emptyAction = filtered ? { href: "/supplier-items", label: "Reset filters" } : canCreate ? { href: "/supplier-items/new", label: "New supplier item" } : undefined;

  return <>
    <PageHeader title="Supplier Items" description="Supplier-specific item codes, costs, UOM, MOQ, and lead time." />
    <WorkspaceGrid hideMobileConsole={!canCreate} rightRail={<>
      {canCreate || permissions["imports.run"] ? <ConsoleSection title="Actions"><div className="grid gap-2">{canCreate ? <Button asChild className="w-full" data-mobile-primary-action><Link href="/supplier-items/new">New supplier item</Link></Button> : null}{permissions["imports.run"] ? <><Button asChild variant="outline" className="w-full"><Link href="/imports/supplier-items">Import supplier items</Link></Button><Button asChild variant="outline" className="w-full"><Link href="/imports/branch-supplier-items">Assign suppliers to branches</Link></Button></> : null}</div></ConsoleSection> : null}
      <ConsoleSection title="Supplier Item Summary"><div className="flex justify-between text-xs"><span className="text-muted-foreground">Matching</span><strong>{page.totalRows}</strong></div></ConsoleSection>
    </>}>
      {filters.error || filters.success ? <div className={`border p-3 text-sm ${filters.error ? "border-destructive text-destructive" : "border-[var(--sb-success)] bg-[var(--sb-success-bg)] text-[var(--sb-success)]"}`}>{filters.error ?? filters.success}</div> : null}
      <div className="space-y-3">
        <MasterDataFilters search={filters.search} status={filters.status} supplier={filters.supplier} suppliers={suppliers.filter((supplier) => supplier.status === "active")} placeholder="Search supplier, AutoCount code, item group, item, supplier item code" resultCount={page.totalRows} filtered={filtered} resetHref="/supplier-items" />
        <div className="sb-list-content-card overflow-hidden">
          <Table className="sb-supplier-items-table" mobileHidden aria-label="Supplier items" stickyColumn="second">
            <TableHeader><TableRow>
              <TableHead className="w-16 pl-3">Action</TableHead>
              <SortableHead label="Supplier" column="supplier_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
              <SortableHead label="Item" column="item_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
              <TableHead>Purchasing Terms</TableHead>
              <SortableHead label="Unit Cost" column="unit_cost" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} className="text-right" />
              <TableHead className="hidden text-right lg:table-cell">MOQ</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Lead Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {page.rows.map((row) => <TableRow key={row.id}>
                    <TableCell className="w-16 p-0 text-center"><TableActionMenuPortal label={`Actions for ${row.supplier_item_code}`}><div className="grid min-w-36 gap-1"><Link href={`/supplier-items/${row.id}`} role="menuitem" className="rounded-[var(--sb-radius-control)] px-2 py-1.5 text-xs hover:bg-[var(--sb-surface-muted)]">Open</Link>{canUpdate ? <form action={deleteSupplierItem.bind(null, row.id)}><SubmitButton type="submit" variant="ghost" size="sm" className="w-full justify-start px-2 text-xs text-[var(--sb-danger)]" pendingLabel="Archiving...">Archive</SubmitButton></form> : null}</div></TableActionMenuPortal></TableCell>
              <TableCell className="whitespace-normal break-words"><p className="font-medium">{row.supplier_name}</p><p className="text-xs text-muted-foreground">{row.supplier_group !== "-" ? row.supplier_group : row.supplier_code !== "-" ? row.supplier_code : "-"}{row.supplier_code !== "-" && row.supplier_code !== row.supplier_group ? ` · AutoCount ${row.supplier_code}` : ""}</p></TableCell>
              <TableCell className="whitespace-normal break-words"><p className="font-medium">{row.item_name}</p><p className="text-xs text-muted-foreground">{row.item_code}</p></TableCell>
              <TableCell><p className="font-medium">{row.purchase_uom}</p><p className="text-xs text-muted-foreground">1 {row.purchase_uom} = {formatNumber(row.conversion_to_base_uom)} base UOM</p></TableCell>
              <TableCell className="text-right">{formatCurrency(row.unit_cost)}</TableCell>
              <TableCell className="hidden text-right lg:table-cell">{formatNumber(row.moq)}</TableCell>
              <TableCell className="hidden text-right lg:table-cell">{row.lead_time_days} days</TableCell>
              <TableCell><Badge variant={row.status === "active" ? "success" : "secondary"}>{row.status}</Badge></TableCell>
              </TableRow>)}
              {!page.rows.length ? <TableRow><TableCell colSpan={11}><EmptyState title={filtered ? "No supplier items match these filters" : "No supplier items yet"} description={filtered ? "Reset the filters or widen the search." : "Supplier item terms appear after a supplier is linked to an item."} action={emptyAction} /></TableCell></TableRow> : null}
            </TableBody>
          </Table>
          <OperationalList ariaLabel="Supplier items">
            {page.rows.map((row) => <OperationalListRow key={row.id} href={`/supplier-items/${row.id}`} label={`Open ${row.supplier_item_code}`} primary={row.item_name} status={<Badge variant={row.status === "active" ? "success" : "secondary"}>{row.status}</Badge>} secondary={`${row.supplier_name} · ${row.supplier_group !== "-" ? row.supplier_group : row.supplier_code} · ${row.supplier_item_code}`} meta={formatCurrency(row.unit_cost)} />)}
            {!page.rows.length ? <EmptyState title={filtered ? "No supplier items match these filters" : "No supplier items yet"} description={filtered ? "Reset the filters or widen the search." : "Supplier item terms appear after a supplier is linked to an item."} action={filtered ? emptyAction : undefined} /> : null}
          </OperationalList>
          <PaginationControls page={page.page} totalPages={page.totalPages} totalRows={page.totalRows} searchParams={filters} />
        </div>
      </div>
    </WorkspaceGrid>
  </>;
}
