import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStockTransfers } from "@/server/queries/stock-operations";

const statuses = ["draft", "submitted", "approved", "posted", "rejected", "cancelled"];
const variant = (s: string) => s === "posted" || s === "approved" ? "success" : s === "rejected" || s === "cancelled" ? "danger" : "secondary";

export default async function StockTransfersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const data = await getStockTransfers(filters);
  return (
    <>
      <PageHeader title="Stock Transfers" description="Move stock between locations through posted transfer in/out ledger movements." action={{ href: "/stock-transfers/new", label: "New Transfer" }} secondaryAction={{ href: "/stock-transfers/scan", label: "Scan Mode" }} />
      <div className="p-5"><div className="overflow-hidden rounded-lg border bg-card">
        <StatusTabs statuses={statuses} activeStatus={filters.status} />
        <form className="flex gap-3 border-b p-4"><Input name="search" defaultValue={filters.search ?? ""} placeholder="Search transfer no, location, remarks" className="max-w-sm" /><Button variant="secondary">Search</Button><Button asChild variant="ghost"><Link href="/stock-transfers">Reset</Link></Button></form>
        <Table><TableHeader><TableRow><TableHead>No</TableHead><TableHead>Date</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Lines</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>{data.rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.transfer_no}</TableCell><TableCell>{row.transfer_date}</TableCell><TableCell>{row.from_location_name ?? "-"}</TableCell><TableCell>{row.to_location_name ?? "-"}</TableCell><TableCell><Badge variant={variant(row.status)}>{row.status}</Badge></TableCell><TableCell className="text-right">{row.line_count}</TableCell><TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/stock-transfers/${row.id}`}>View</Link></Button></TableCell></TableRow>)}
          {!data.rows.length ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No transfers found.</TableCell></TableRow> : null}</TableBody></Table>
        <PaginationControls page={data.page} totalPages={data.totalPages} totalRows={data.totalRows} searchParams={filters} />
      </div></div>
    </>
  );
}
