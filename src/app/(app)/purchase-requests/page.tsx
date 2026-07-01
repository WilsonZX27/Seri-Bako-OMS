import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { getPurchaseRequests } from "@/server/queries/procurement";

const statuses = ["draft", "submitted", "admin_review", "purchasing_review", "pending_approval", "approved", "rejected", "converted", "cancelled"];

function statusVariant(status: string) {
  if (["approved", "converted"].includes(status)) return "success";
  if (["rejected", "cancelled"].includes(status)) return "danger";
  return "secondary";
}

export default async function PurchaseRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const requests = await getPurchaseRequests(filters);
  return (
    <>
      <PageHeader title="Purchase Requests" description="Daily stock check and low-stock replenishment requests before PO creation." action={{ href: "/purchase-requests/new", label: "New PR" }} />
      <div className="p-5">
        <div className="overflow-hidden rounded-lg border bg-card">
          <StatusTabs statuses={statuses} activeStatus={filters.status} />
          <form className="flex flex-col gap-3 border-b p-4 md:flex-row">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search PR no, branch, location, remarks" className="md:max-w-sm" />
            <Button type="submit" variant="secondary">Search</Button>
            <Button asChild variant="ghost"><a href="?">Reset</a></Button>
          </form>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Request No" column="request_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Request Date" column="request_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Required Date" column="required_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Branch</TableHead>
                  <TableHead>Location</TableHead>
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Estimated Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.rows.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.request_no}</TableCell>
                    <TableCell>{request.request_date}</TableCell>
                    <TableCell>{request.required_date ?? "-"}</TableCell>
                    <TableCell>{request.branch_name ?? "-"}</TableCell>
                    <TableCell>{request.location_name ?? "-"}</TableCell>
                    <TableCell><Badge variant={statusVariant(request.status)}>{request.status}</Badge></TableCell>
                    <TableCell className="text-right">{request.line_count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(request.estimated_total)}</TableCell>
                    <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={`/purchase-requests/${request.id}`}>View</Link></Button></TableCell>
                  </TableRow>
                ))}
                {!requests.rows.length ? <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No purchase requests found.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          <PaginationControls page={requests.page} totalPages={requests.totalPages} totalRows={requests.totalRows} searchParams={filters} />
        </div>
      </div>
    </>
  );
}
