import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paginateRows } from "@/lib/table-state";
import { formatNumber } from "@/lib/utils";
import { deleteUomConversion } from "@/server/actions/master-data";
import { getUomConversions } from "@/server/queries/master-data";

export default async function UomConversionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const rows = await getUomConversions(filters);
  const page = paginateRows(rows, filters.page);

  return (
    <>
      <PageHeader title="UOM Conversions" description="Basic unit conversion factors used by recipes, supplier items, and future receiving." action={{ href: "/uom-conversions/new", label: "New conversion" }} />
      <div className="p-5">
        <div className="overflow-hidden rounded-lg border bg-card">
          <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search UOM pair" />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="From UOM" column="from_uom" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="To UOM" column="to_uom" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Factor" column="factor" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} className="text-right" />
                  <TableHead>Status</TableHead>
                  <TableHead className="w-36 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.from_uom}</TableCell>
                    <TableCell>{row.to_uom}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.factor)}</TableCell>
                    <TableCell><Badge variant={row.status === "active" ? "success" : "secondary"}>{row.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm"><Link href={`/uom-conversions/${row.id}`}>Edit</Link></Button>
                        <form action={deleteUomConversion.bind(null, row.id)}><Button variant="ghost" size="sm">Archive</Button></form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!page.rows.length ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No UOM conversions found.</TableCell></TableRow>
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
