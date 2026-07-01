import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { PaginationControls } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { wastageReasons } from "@/lib/validations/stock-operations";
import { getStockWastage } from "@/server/queries/stock-operations";

const statuses = ["draft", "submitted", "approved", "posted", "rejected", "cancelled"];
const variant = (s: string) => s === "posted" || s === "approved" ? "success" : s === "rejected" || s === "cancelled" ? "danger" : "secondary";

export default async function StockWastagePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const data = await getStockWastage(filters);
  return (
    <><PageHeader title="Stock Wastage" description="Record expired, damaged, missing, or abnormal stock loss." action={{ href: "/stock-wastage/new", label: "New Wastage" }} secondaryAction={{ href: "/stock-wastage/scan", label: "Scan Mode" }} />
    <div className="p-5"><div className="overflow-hidden rounded-lg border bg-card"><StatusTabs statuses={statuses} activeStatus={filters.status} />
      <form className="grid gap-3 border-b p-4 md:grid-cols-[1fr_180px_auto_auto]"><Input name="search" defaultValue={filters.search ?? ""} placeholder="Search wastage no, reason, location" /><SelectNative name="reason" defaultValue={filters.reason ?? "all"}><option value="all">All reasons</option>{wastageReasons.map((r) => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}</SelectNative><Button variant="secondary">Filter</Button><Button asChild variant="ghost"><Link href="/stock-wastage">Reset</Link></Button></form>
      <Table><TableHeader><TableRow><TableHead>No</TableHead><TableHead>Date</TableHead><TableHead>Location</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Lines</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{data.rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.wastage_no}</TableCell><TableCell>{row.wastage_date}</TableCell><TableCell>{row.location_name ?? "-"}</TableCell><TableCell>{row.reason.replaceAll("_", " ")}</TableCell><TableCell><Badge variant={variant(row.status)}>{row.status}</Badge></TableCell><TableCell className="text-right">{row.line_count}</TableCell><TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/stock-wastage/${row.id}`}>View</Link></Button></TableCell></TableRow>)}{!data.rows.length ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No wastage found.</TableCell></TableRow> : null}</TableBody></Table>
      <PaginationControls page={data.page} totalPages={data.totalPages} totalRows={data.totalRows} searchParams={filters} />
    </div></div></>
  );
}
