import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paginateRows } from "@/lib/table-state";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { deleteSupplierItem } from "@/server/actions/master-data";
import { getSupplierItems } from "@/server/queries/master-data";

export default async function SupplierItemsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const rows = await getSupplierItems(filters);
  const page = paginateRows(rows, filters.page);

  return (
    <>
      <PageHeader title="Supplier Items" description="Supplier-specific item codes, costs, UOM, MOQ, and lead time." action={{ href: "/supplier-items/new", label: "New supplier item" }} />
      <div className="space-y-4 p-5">
        {filters.error || filters.success ? (
          <Card>
            <CardContent className={`p-4 text-sm ${filters.error ? "text-destructive" : "text-emerald-700"}`}>
              {filters.error ?? filters.success}
            </CardContent>
          </Card>
        ) : null}
        <div className="mb-3 flex justify-end">
          <Button asChild variant="outline" size="sm"><Link href="/imports/supplier-items">Import supplier items</Link></Button>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search supplier, item, supplier item code" />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Supplier" column="supplier_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Item" column="item_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Supplier Code" column="supplier_item_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Supplier Name" column="supplier_item_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Purchase UOM" column="purchase_uom" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="text-right">Conversion</TableHead>
                  <SortableHead label="Unit Cost" column="unit_cost" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} className="text-right" />
                  <TableHead className="text-right">MOQ</TableHead>
                  <TableHead className="text-right">Lead Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-36 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.supplier_name}</TableCell>
                    <TableCell>
                      <p className="font-medium">{row.item_name}</p>
                      <p className="text-xs text-muted-foreground">{row.item_code}</p>
                    </TableCell>
                    <TableCell>{row.supplier_item_code}</TableCell>
                    <TableCell>{row.supplier_item_name}</TableCell>
                    <TableCell>{row.purchase_uom}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.conversion_to_base_uom)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.unit_cost)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.moq)}</TableCell>
                    <TableCell className="text-right">{row.lead_time_days} days</TableCell>
                    <TableCell><Badge variant={row.status === "active" ? "success" : "secondary"}>{row.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm"><Link href={`/supplier-items/${row.id}`}>Edit</Link></Button>
                        <form action={deleteSupplierItem.bind(null, row.id)}><Button variant="ghost" size="sm">Archive</Button></form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!page.rows.length ? (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">No supplier items found.</TableCell></TableRow>
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
