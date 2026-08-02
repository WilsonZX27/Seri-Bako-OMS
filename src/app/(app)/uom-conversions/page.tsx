import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { Table, TableActionMenu, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paginateRows } from "@/lib/table-state";
import { formatNumber } from "@/lib/utils";
import { deleteUomConversion } from "@/server/actions/master-data";
import { getUomConversions } from "@/server/queries/master-data";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";

export default async function UomConversionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const rows = await getUomConversions(filters);
  const page = paginateRows(rows, filters.page);

  return (
    <>
      <PageHeader title="UOM Conversions" description="Basic unit conversion factors used by recipes, supplier items, and future receiving." />
      <WorkspaceGrid rightRail={<ConsoleSection title="Actions"><Button asChild className="w-full" data-mobile-primary-action><Link href="/uom-conversions/new">New conversion</Link></Button></ConsoleSection>}>
        {filters.error || filters.success ? (
          <Card>
            <CardContent className={`p-4 text-sm ${filters.error ? "text-destructive" : "text-[var(--sb-success)]"}`}>
              {filters.error ?? filters.success}
            </CardContent>
          </Card>
        ) : null}
        <div className="overflow-hidden rounded-[2px] border bg-card">
          <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search UOM pair" />
          <div className="overflow-x-auto">
            <Table stickyColumn="second">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Action</TableHead>
                  <SortableHead label="From UOM" column="from_uom" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="To UOM" column="to_uom" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Factor" column="factor" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} className="text-right" />
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="w-16 p-0 text-center"><TableActionMenu label={`Actions for ${row.from_uom} to ${row.to_uom}`}><div className="grid min-w-28 gap-1"><Link href={`/uom-conversions/${row.id}`} role="menuitem" className="rounded-[var(--sb-radius-control)] px-2 py-1.5 text-xs hover:bg-[var(--sb-surface-muted)]">Edit</Link><form action={deleteUomConversion.bind(null, row.id)}><SubmitButton type="submit" variant="ghost" size="sm" className="w-full justify-start px-2 text-xs text-[var(--sb-danger)]" pendingLabel="Archiving...">Archive</SubmitButton></form></div></TableActionMenu></TableCell>
                    <TableCell>{row.from_uom}</TableCell>
                    <TableCell>{row.to_uom}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.factor)}</TableCell>
                    <TableCell><Badge variant={row.status === "active" ? "success" : "secondary"}>{row.status}</Badge></TableCell>
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
      </WorkspaceGrid>
    </>
  );
}
