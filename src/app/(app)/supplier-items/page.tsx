import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { OperationalList, OperationalListRow, Table, TableActionMenu, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hasActiveFilters, paginateRows } from "@/lib/table-state";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { deleteSupplierItem } from "@/server/actions/master-data";
import { getPermissionMap } from "@/server/auth/permissions";
import { getSupplierItems } from "@/server/queries/master-data";

export default async function SupplierItemsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [rows, permissions] = await Promise.all([getSupplierItems(filters), getPermissionMap(["supplier_items.create", "supplier_items.update", "imports.run"])]);
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
      <div className="overflow-hidden rounded-[2px] border bg-card">
        <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search supplier, item, supplier item code" resultCount={page.totalRows} filtered={filtered} resetHref="/supplier-items" />
        <Table mobileHidden aria-label="Supplier items" stickyColumn="second">
          <TableHeader><TableRow>
            <TableHead className="w-11">Actions</TableHead>
            <SortableHead label="Supplier" column="supplier_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
            <SortableHead label="Item" column="item_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
            <SortableHead label="Supplier Code" column="supplier_item_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
            <TableHead className="hidden lg:table-cell">Supplier Name</TableHead>
            <TableHead>Purchase UOM</TableHead>
            <TableHead className="hidden text-right lg:table-cell">Conversion</TableHead>
            <SortableHead label="Unit Cost" column="unit_cost" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} className="text-right" />
            <TableHead className="hidden text-right lg:table-cell">MOQ</TableHead>
            <TableHead className="hidden text-right lg:table-cell">Lead Time</TableHead>
            <TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {page.rows.map((row) => <TableRow key={row.id}>
              <TableCell className="w-11 p-0 text-center"><TableActionMenu label={`Actions for ${row.supplier_item_code}`}><div className="grid min-w-28 gap-1"><Link href={`/supplier-items/${row.id}`} role="menuitem" className="rounded-[var(--sb-radius-control)] px-2 py-1.5 text-xs hover:bg-[var(--sb-surface-muted)]">Open</Link>{canUpdate ? <form action={deleteSupplierItem.bind(null, row.id)}><Button type="submit" variant="ghost" size="sm" className="w-full justify-start px-2 text-xs text-[var(--sb-danger)]">Archive</Button></form> : null}</div></TableActionMenu></TableCell>
              <TableCell>{row.supplier_name}</TableCell>
              <TableCell><p className="font-medium">{row.item_name}</p><p className="text-xs text-muted-foreground">{row.item_code}</p></TableCell>
              <TableCell>{row.supplier_item_code}</TableCell>
              <TableCell className="hidden lg:table-cell">{row.supplier_item_name}</TableCell>
              <TableCell>{row.purchase_uom}</TableCell>
              <TableCell className="hidden text-right lg:table-cell">{formatNumber(row.conversion_to_base_uom)}</TableCell>
              <TableCell className="text-right">{formatCurrency(row.unit_cost)}</TableCell>
              <TableCell className="hidden text-right lg:table-cell">{formatNumber(row.moq)}</TableCell>
              <TableCell className="hidden text-right lg:table-cell">{row.lead_time_days} days</TableCell>
              <TableCell><Badge variant={row.status === "active" ? "success" : "secondary"}>{row.status}</Badge></TableCell>
            </TableRow>)}
            {!page.rows.length ? <TableRow><TableCell colSpan={11}><EmptyState title={filtered ? "No supplier items match these filters" : "No supplier items yet"} description={filtered ? "Reset the filters or widen the search." : "Supplier item terms appear after a supplier is linked to an item."} action={emptyAction} /></TableCell></TableRow> : null}
          </TableBody>
        </Table>
        <OperationalList ariaLabel="Supplier items">
          {page.rows.map((row) => <OperationalListRow key={row.id} href={`/supplier-items/${row.id}`} label={`Open ${row.supplier_item_code}`} primary={row.item_name} status={<Badge variant={row.status === "active" ? "success" : "secondary"}>{row.status}</Badge>} secondary={`${row.supplier_name} · ${row.supplier_item_code}`} meta={formatCurrency(row.unit_cost)} />)}
          {!page.rows.length ? <EmptyState title={filtered ? "No supplier items match these filters" : "No supplier items yet"} description={filtered ? "Reset the filters or widen the search." : "Supplier item terms appear after a supplier is linked to an item."} action={filtered ? emptyAction : undefined} /> : null}
        </OperationalList>
        <PaginationControls page={page.page} totalPages={page.totalPages} totalRows={page.totalRows} searchParams={filters} />
      </div>
    </WorkspaceGrid>
  </>;
}
