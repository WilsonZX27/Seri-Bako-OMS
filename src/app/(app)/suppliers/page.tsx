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
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSelectionCell, TableSelectionHead } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { hasActiveFilters } from "@/lib/table-state";
import { getSuppliers } from "@/server/queries/suppliers";
import { getPermissionMap } from "@/server/auth/permissions";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filters = await searchParams;
  const [page, permissions] = await Promise.all([getSuppliers(filters), getPermissionMap(["suppliers.create", "suppliers.manage", "imports.run"])]);
  const filtered = hasActiveFilters(filters);
  const canCreate = permissions["suppliers.create"];
  const emptyAction = filtered ? { href: "/suppliers", label: "Reset filters" } : canCreate ? { href: "/suppliers/new", label: "New supplier" } : undefined;

  return (
    <>
      <PageHeader title="Suppliers" description="Supplier identity, contacts, terms, and purchasing availability." />
      <WorkspaceGrid
        hideMobileConsole={!canCreate}
        rightRail={
          <>
            {canCreate || permissions["suppliers.manage"] || permissions["imports.run"] ? <ConsoleSection title="Actions">
              <div className="grid gap-2">
                {canCreate ? <Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/suppliers/new">New supplier</Link></Button> : null}
                {permissions["suppliers.manage"] ? <Button asChild variant="outline" size="sm" className="w-full"><Link href="/api/export/suppliers">Export CSV</Link></Button> : null}
                {permissions["imports.run"] ? <Button asChild variant="outline" size="sm" className="w-full"><Link href="/imports/suppliers">Import suppliers</Link></Button> : null}
              </div>
            </ConsoleSection> : null}
            <ConsoleSection title="Supplier Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Matching Suppliers</span><strong>{page.totalRows}</strong></div>
              </div>
            </ConsoleSection>
          </>
        }
      >
        {filters.success ? <div className="border border-[var(--sb-success)] bg-[var(--sb-success-bg)] p-3 text-sm text-[var(--sb-success)]">{filters.success}</div> : null}
        <div className="overflow-hidden rounded-[2px] border bg-card">
          <MasterDataFilters search={filters.search} status={filters.status} showStatus={false} leadingFilter={<StatusTabs statuses={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} activeStatus={filters.status} />} placeholder="Search supplier code, name, contact, phone, email" resultCount={page.totalRows} filtered={filtered} resetHref="/suppliers" />
          <BulkSelectionProvider ids={page.rows.map((supplier) => supplier.id)} actionLabel="Deactivate selected" actionHint="Deactivate suppliers only when they should no longer be used for purchasing.">
          <DataGridHint text="Pro-tip: Double-click any row to open the supplier." />
          <Table mobileHidden aria-label="Suppliers" stickyColumn="second">
            <TableHeader>
              <TableRow>
                <TableSelectionHead><BulkSelectAllCheckbox /></TableSelectionHead>
                <SortableHead label="Supplier Code" column="supplier_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Supplier Name" column="name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead className="hidden lg:table-cell" label="Contact Person" column="contact_person" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead className="hidden md:table-cell" label="Phone" column="phone" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead className="hidden xl:table-cell" label="Email" column="email" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead className="hidden lg:table-cell" label="Payment Terms" column="payment_terms_days" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <TableHead className="w-12 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.rows.map((supplier) => (
                <DataGridRow key={supplier.id} href={`/suppliers/${supplier.id}`}>
                    <TableSelectionCell>
                     <BulkSelectRowCheckbox id={supplier.id} />
                    </TableSelectionCell>
                  <TableCell>{supplier.supplier_code ?? "-"}</TableCell>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="hidden lg:table-cell">{supplier.contact_person ?? "-"}</TableCell>
                  <TableCell className="hidden md:table-cell">{supplier.phone ?? "-"}</TableCell>
                  <TableCell className="hidden xl:table-cell">{supplier.email ?? "-"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{supplier.payment_terms_days} days</TableCell>
                  <TableCell>
                    <Badge variant={supplier.status === "active" ? "success" : "secondary"}>{supplier.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right"><TableActionLink href={`/suppliers/${supplier.id}`} label={`Open ${supplier.name}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                </DataGridRow>
              ))}
              {!page.rows.length ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <EmptyState
                      title={filtered ? "No records match these filters" : "No suppliers yet"}
                      description={filtered ? "Clear filters or widen the search to see more suppliers." : "Suppliers will appear here after they are created or imported."}
                      action={emptyAction}
                    />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <OperationalList ariaLabel="Suppliers">
            {page.rows.map((supplier) => <OperationalListRow key={supplier.id} href={`/suppliers/${supplier.id}`} label={`Open ${supplier.name}`} primary={supplier.name} status={<Badge variant={supplier.status === "active" ? "success" : "secondary"}>{supplier.status}</Badge>} secondary={`${supplier.supplier_code ?? "No code"} · ${supplier.contact_person ?? "No contact"}`} meta={supplier.payment_terms_days ? `${supplier.payment_terms_days} days` : undefined} />)}
            {!page.rows.length ? <EmptyState title={filtered ? "No suppliers match these filters" : "No suppliers yet"} description={filtered ? "Reset the filters or widen the search." : "Suppliers appear after they are created or imported."} action={filtered ? emptyAction : undefined} /> : null}
          </OperationalList>
          </BulkSelectionProvider>
          <PaginationControls page={page.page} totalPages={page.totalPages} totalRows={page.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
