import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
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
      <PageHeader title="Suppliers" description="Supplier master records for ingredients and packaging." action={{ href: "/suppliers/new", label: "New supplier" }} />
      <div className="p-5">
        {filters.success ? <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{filters.success}</div> : null}
        <div className="mb-3 flex justify-end">
          <Button asChild variant="outline" size="sm"><Link href="/imports/suppliers">Import suppliers</Link></Button>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search supplier code, name, contact, phone, email" />
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Supplier Code" column="supplier_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Supplier Name" column="name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Contact Person" column="contact_person" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Phone" column="phone" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Email" column="email" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Payment Terms" column="payment_terms_days" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <TableHead className="w-36 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.rows.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>{supplier.supplier_code ?? "-"}</TableCell>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contact_person ?? "-"}</TableCell>
                  <TableCell>{supplier.phone ?? "-"}</TableCell>
                  <TableCell>{supplier.email ?? "-"}</TableCell>
                  <TableCell>{supplier.payment_terms_days} days</TableCell>
                  <TableCell>
                    <Badge variant={supplier.status === "active" ? "success" : "secondary"}>{supplier.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/suppliers/${supplier.id}`}>Edit</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!page.rows.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No suppliers found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          </div>
          <PaginationControls page={page.page} totalPages={page.totalPages} totalRows={page.totalRows} searchParams={filters} />
        </div>
      </div>
    </>
  );
}
