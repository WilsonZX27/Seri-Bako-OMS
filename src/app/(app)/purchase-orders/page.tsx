import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { getPurchaseOrders } from "@/server/queries/procurement";

const statuses = [
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "awaiting_delivery", label: "Awaiting delivery" },
  { value: "receiving", label: "Receiving" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function statusVariant(status: string) {
  if (["approved", "sent", "received", "closed"].includes(status)) return "success";
  if (status === "cancelled") return "danger";
  return "secondary";
}

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const orders = await getPurchaseOrders(filters);
  return (
    <>
      <PageHeader title="Purchase Orders" description="Supplier purchase orders created from approved requests or manually." action={{ href: "/purchase-orders/new", label: "New PO" }} />
      <div className="p-5">
        <div className="overflow-hidden rounded-lg border bg-card">
          <StatusTabs statuses={statuses} activeStatus={filters.status} />
          <form className="flex flex-col gap-3 border-b p-4 md:flex-row">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search PO no, supplier, remarks" className="md:max-w-sm" />
            <Button type="submit" variant="secondary">Search</Button>
            <Button asChild variant="ghost"><a href="?">Reset</a></Button>
          </form>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="PO No" column="po_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Supplier</TableHead>
                  <SortableHead label="Order Date" column="order_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Expected Delivery" column="expected_delivery_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Approval" column="approval_status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.rows.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.po_no}</TableCell>
                    <TableCell>{order.supplier_name ?? "-"}</TableCell>
                    <TableCell>{order.order_date}</TableCell>
                    <TableCell>{order.expected_delivery_date ?? "-"}</TableCell>
                    <TableCell><Badge variant={statusVariant(order.status)}>{order.status}</Badge></TableCell>
                    <TableCell><Badge variant={statusVariant(order.approval_status)}>{order.approval_status}</Badge></TableCell>
                    <TableCell className="text-right">{order.line_count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.order_total)}</TableCell>
                    <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={`/purchase-orders/${order.id}`}>View</Link></Button></TableCell>
                  </TableRow>
                ))}
                {!orders.rows.length ? <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No purchase orders found.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          <PaginationControls page={orders.page} totalPages={orders.totalPages} totalRows={orders.totalRows} searchParams={filters} />
        </div>
      </div>
    </>
  );
}
