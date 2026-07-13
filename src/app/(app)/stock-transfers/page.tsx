import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Eye, FileText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/sortable-table";
import { ConsoleSection, RightConsoleMount } from "@/components/layout/right-console";
import { StatusTabs } from "@/components/status-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStockTransfers } from "@/server/queries/stock-operations";

const statuses = ["draft", "in_transit", "completed", "rejected", "cancelled"];

export default async function StockTransfersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [data, allData] = await Promise.all([getStockTransfers(filters), getStockTransfers({ page: "all" })]);
  const rows = allData.rows;
  const countByStatus = (...values: string[]) => rows.filter((row) => values.includes(row.status)).length;
  const insights = [
    { label: "Total", value: rows.length, href: "/stock-transfers", active: !filters.status, icon: FileText },
    { label: "Draft", value: countByStatus("draft"), href: "/stock-transfers?status=draft", active: filters.status === "draft", icon: FileText },
    { label: "In Transit", value: countByStatus("in_transit"), href: "/stock-transfers?status=in_transit", active: filters.status === "in_transit", icon: ClipboardCheck },
    { label: "Completed", value: countByStatus("completed"), href: "/stock-transfers?status=completed", active: filters.status === "completed", icon: CheckCircle2 },
    { label: "Rejected/Cancelled", value: countByStatus("rejected", "cancelled"), href: "/stock-transfers?status=rejected", active: filters.status === "rejected", icon: XCircle },
  ];
  return (
    <>
      <PageHeader title="Stock Transfers" description="Move stock between locations through posted transfer in/out ledger movements." action={{ href: "/stock-transfers/new", label: "New Transfer" }} secondaryAction={{ href: "/stock-transfers/scan", label: "Scan Mode" }} />
      <RightConsoleMount>
        <ConsoleSection title="Transfer Summary">
          <div className="grid gap-2 text-xs">
            {insights.map((item) => (
              <Link key={item.label} href={item.href} className="flex justify-between rounded-none px-2 py-1.5 hover:bg-[var(--sb-surface-muted)]">
                <span className={item.active ? "font-semibold text-foreground" : "text-muted-foreground"}>{item.label}</span>
                <strong>{item.value}</strong>
              </Link>
            ))}
          </div>
        </ConsoleSection>
      </RightConsoleMount>
      <div className="space-y-4 p-5"><div className="overflow-hidden rounded-[2px] border border-[var(--sb-border-soft)] bg-card">
        <StatusTabs statuses={statuses} activeStatus={filters.status} />
        <form className="flex gap-3 border-b p-4"><Input name="search" defaultValue={filters.search ?? ""} placeholder="Search transfer no, location, remarks" className="max-w-sm" /><Button variant="secondary">Search</Button><Button asChild variant="ghost"><Link href="/stock-transfers">Reset</Link></Button></form>
        <DataGridHint text="Pro-tip: Double-click any row to open the stock transfer." />
        <Table><TableHeader><TableRow><TableHead className="w-10"></TableHead><TableHead>No</TableHead><TableHead>Date</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Lines</TableHead></TableRow></TableHeader>
          <TableBody>{data.rows.map((row) => <DataGridRow key={row.id} href={`/stock-transfers/${row.id}`}><TableCell><Link href={`/stock-transfers/${row.id}`} aria-label={`Quick view ${row.transfer_no}`} className="rounded-none p-1 text-[var(--sb-text-soft)] opacity-0 hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-amber-700)] group-hover:opacity-100"><Eye className="h-4 w-4" /></Link></TableCell><TableCell className="font-medium">{row.transfer_no}</TableCell><TableCell>{row.transfer_date}</TableCell><TableCell>{row.from_location_name ?? "-"}</TableCell><TableCell>{row.to_location_name ?? "-"}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell className="text-right">{row.line_count}</TableCell></DataGridRow>)}
          {!data.rows.length ? <TableRow><TableCell colSpan={7}><EmptyState title="No transfers found" description="Stock transfers will appear here after stock is moved between branches or locations." action={{ href: "/stock-transfers/new", label: "New Transfer" }} /></TableCell></TableRow> : null}</TableBody></Table>
        <PaginationControls page={data.page} totalPages={data.totalPages} totalRows={data.totalRows} searchParams={filters} />
      </div></div>
    </>
  );
}
