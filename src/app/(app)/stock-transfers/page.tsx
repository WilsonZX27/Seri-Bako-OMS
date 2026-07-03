import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStockTransfers } from "@/server/queries/stock-operations";

const statuses = ["draft", "submitted", "approved", "posted", "rejected", "cancelled"];

export default async function StockTransfersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const data = await getStockTransfers(filters);
  return (
    <>
      <PageHeader title="Stock Transfers" description="Move stock between locations through posted transfer in/out ledger movements." action={{ href: "/stock-transfers/new", label: "New Transfer" }} secondaryAction={{ href: "/stock-transfers/scan", label: "Scan Mode" }} />
      <div className="p-5"><div className="overflow-hidden rounded-lg border bg-card">
        <StatusTabs statuses={statuses} activeStatus={filters.status} />
        <form className="flex gap-3 border-b p-4"><Input name="search" defaultValue={filters.search ?? ""} placeholder="Search transfer no, location, remarks" className="max-w-sm" /><Button variant="secondary">Search</Button><Button asChild variant="ghost"><Link href="/stock-transfers">Reset</Link></Button></form>
        <DataGridHint text="Pro-tip: Double-click any row to open the stock transfer." />
        <Table><TableHeader><TableRow><TableHead className="w-10"></TableHead><TableHead>No</TableHead><TableHead>Date</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Lines</TableHead></TableRow></TableHeader>
          <TableBody>{data.rows.map((row) => <DataGridRow key={row.id} href={`/stock-transfers/${row.id}`}><TableCell><Link href={`/stock-transfers/${row.id}`} aria-label={`Quick view ${row.transfer_no}`} className="rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-primary group-hover:opacity-100"><Eye className="h-4 w-4" /></Link></TableCell><TableCell className="font-medium">{row.transfer_no}</TableCell><TableCell>{row.transfer_date}</TableCell><TableCell>{row.from_location_name ?? "-"}</TableCell><TableCell>{row.to_location_name ?? "-"}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell className="text-right">{row.line_count}</TableCell></DataGridRow>)}
          {!data.rows.length ? <TableRow><TableCell colSpan={7}><EmptyState title="No transfers found" description="Stock transfers will appear here after stock is moved between branches or locations." action={{ href: "/stock-transfers/new", label: "New Transfer" }} /></TableCell></TableRow> : null}</TableBody></Table>
        <PaginationControls page={data.page} totalPages={data.totalPages} totalRows={data.totalRows} searchParams={filters} />
      </div></div>
    </>
  );
}
