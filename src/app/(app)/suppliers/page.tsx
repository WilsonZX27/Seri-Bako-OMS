import Link from "next/link";
import { Eye } from "lucide-react";
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
import { paginateRows } from "@/lib/table-state";
import { getSuppliers } from "@/server/queries/suppliers";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filters = await searchParams;
  const suppliers = await getSuppliers(filters);
  const page = paginateRows(suppliers, filters.page);

  return (
    <>
      <PageHeader title="Suppliers" description="Supplier master records for ingredients and packaging." action={{ href: "/suppliers/new", label: "New supplier" }} secondaryAction={{ href: "/api/export/suppliers", label: "Export CSV" }} />
      <div className="p-5">
        {filters.success ? <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{filters.success}</div> : null}
        <div className="mb-3 flex justify-end">
          <Button asChild variant="outline" size="sm"><Link href="/imports/suppliers">Import suppliers</Link></Button>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <StatusTabs statuses={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "archived", label: "Archived" }]} activeStatus={filters.status} />
          <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search supplier code, name, contact, phone, email" />
          <BulkSelectionProvider ids={page.rows.map((supplier) => supplier.id)} actionLabel="Deactivate selected" actionHint="Deactivate suppliers only when they should no longer be used for purchasing.">
          <DataGridHint text="Pro-tip: Double-click any row to open the supplier." />
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16"><BulkSelectAllCheckbox /></TableHead>
                <SortableHead label="Supplier Code" column="supplier_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Supplier Name" column="name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Contact Person" column="contact_person" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Phone" column="phone" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Email" column="email" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Payment Terms" column="payment_terms_days" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.rows.map((supplier) => (
                <DataGridRow key={supplier.id} href={`/suppliers/${supplier.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <BulkSelectRowCheckbox id={supplier.id} />
                      <Link href={`/suppliers/${supplier.id}`} aria-label={`Quick view ${supplier.name}`} className="rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-primary group-hover:opacity-100">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>{supplier.supplier_code ?? "-"}</TableCell>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contact_person ?? "-"}</TableCell>
                  <TableCell>{supplier.phone ?? "-"}</TableCell>
                  <TableCell>{supplier.email ?? "-"}</TableCell>
                  <TableCell>{supplier.payment_terms_days} days</TableCell>
                  <TableCell>
                    <Badge variant={supplier.status === "active" ? "success" : "secondary"}>{supplier.status}</Badge>
                  </TableCell>
                </DataGridRow>
              ))}
              {!page.rows.length ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState title="No suppliers found" description="Suppliers will appear here after they are created or imported." action={{ href: "/suppliers/new", label: "New supplier" }} />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          </div>
          </BulkSelectionProvider>
          <PaginationControls page={page.page} totalPages={page.totalPages} totalRows={page.totalRows} searchParams={filters} />
        </div>
      </div>
    </>
  );
}
