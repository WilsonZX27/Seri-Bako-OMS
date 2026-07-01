import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { getGoodsReceivings } from "@/server/queries/goods-receivings";

const statuses = ["draft", "posted", "cancelled"];

function statusVariant(status: string) {
  if (status === "posted") return "success";
  if (status === "cancelled") return "danger";
  return "secondary";
}

export default async function GoodsReceivingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const receivings = await getGoodsReceivings(filters);
  return (
    <>
      <PageHeader
        title="Goods Receiving"
        description="Receive supplier deliveries against approved purchase orders. Stock increases only after GRN posting."
        action={{ href: "/goods-receivings/new", label: "New GRN" }}
        secondaryAction={{ href: "/goods-receivings/scan", label: "Scan Mode" }}
      />
      <div className="p-5">
        <div className="overflow-hidden rounded-lg border bg-card">
          <StatusTabs statuses={statuses} activeStatus={filters.status} />
          <form className="flex flex-col gap-3 border-b p-4 md:flex-row">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search GRN no, PO, supplier, location" className="md:max-w-sm" />
            <Button type="submit" variant="secondary">Search</Button>
            <Button asChild variant="ghost"><a href="?">Reset</a></Button>
          </form>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="GRN No" column="grn_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>PO</TableHead>
                  <TableHead>Supplier</TableHead>
                  <SortableHead label="Received Date" column="received_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Location</TableHead>
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivings.rows.map((receiving) => (
                  <TableRow key={receiving.id}>
                    <TableCell className="font-medium">{receiving.grn_no}</TableCell>
                    <TableCell>{receiving.po_no ?? "-"}</TableCell>
                    <TableCell>{receiving.supplier_name ?? "-"}</TableCell>
                    <TableCell>{receiving.received_date}</TableCell>
                    <TableCell>{receiving.location_name ?? "-"}</TableCell>
                    <TableCell><Badge variant={statusVariant(receiving.status)}>{receiving.status}</Badge></TableCell>
                    <TableCell className="text-right">{formatNumber(receiving.received_total)}</TableCell>
                    <TableCell className="text-right">{formatNumber(receiving.rejected_total)}</TableCell>
                    <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={`/goods-receivings/${receiving.id}`}>View</Link></Button></TableCell>
                  </TableRow>
                ))}
                {!receivings.rows.length ? <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No goods receivings found.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          <PaginationControls page={receivings.page} totalPages={receivings.totalPages} totalRows={receivings.totalRows} searchParams={filters} />
        </div>
      </div>
    </>
  );
}
