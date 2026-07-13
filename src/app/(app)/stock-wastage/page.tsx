import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Pencil, FileText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { PaginationControls } from "@/components/sortable-table";
import { ConsoleSection, RightConsoleMount } from "@/components/layout/right-console";
import { StatusTabs } from "@/components/status-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { wastageReasons } from "@/lib/validations/stock-operations";
import { getStockWastage } from "@/server/queries/stock-operations";

const statuses = ["draft", "submitted", "approved", "posted", "rejected", "cancelled"];

export default async function StockWastagePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [data, allData] = await Promise.all([getStockWastage(filters), getStockWastage({ page: "all" })]);
  const rows = allData.rows;
  const countByStatus = (...values: string[]) => rows.filter((row) => values.includes(row.status)).length;
  const insights = [
    { label: "Total", value: rows.length, href: "/stock-wastage", active: !filters.status, icon: FileText },
    { label: "Draft", value: countByStatus("draft"), href: "/stock-wastage?status=draft", active: filters.status === "draft", icon: FileText },
    { label: "In Review", value: countByStatus("submitted"), href: "/stock-wastage?status=submitted", active: filters.status === "submitted", icon: ClipboardCheck },
    { label: "Approved", value: countByStatus("approved"), href: "/stock-wastage?status=approved", active: filters.status === "approved", icon: CheckCircle2 },
    { label: "Posted", value: countByStatus("posted"), href: "/stock-wastage?status=posted", active: filters.status === "posted", icon: CheckCircle2 },
    { label: "Rejected/Cancelled", value: countByStatus("rejected", "cancelled"), href: "/stock-wastage?status=rejected", active: filters.status === "rejected", icon: XCircle },
  ];
  return (
    <><PageHeader title="Stock Wastage" description="Record expired, damaged, missing, or abnormal stock loss." action={{ href: "/stock-wastage/new", label: "New Wastage" }} />
    <RightConsoleMount>
      <ConsoleSection title="Wastage Summary">
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
    <div className="space-y-4 p-5"><div className="overflow-hidden rounded-[2px] border border-[var(--sb-border-soft)] bg-card"><StatusTabs statuses={statuses} activeStatus={filters.status} />
      <form className="grid gap-3 border-b p-4 md:grid-cols-[1fr_180px_auto_auto]"><Input name="search" defaultValue={filters.search ?? ""} placeholder="Search wastage no, reason, location" /><SelectNative name="reason" defaultValue={filters.reason ?? "all"}><option value="all">All reasons</option>{wastageReasons.map((r) => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}</SelectNative><Button variant="secondary">Filter</Button><Button asChild variant="ghost"><Link href="/stock-wastage">Reset</Link></Button></form>
      <DataGridHint text="Pro-tip: Double-click any row to open the wastage document." />
      <Table><TableHeader><TableRow><TableHead className="w-10"></TableHead><TableHead>No</TableHead><TableHead>Date</TableHead><TableHead>Location</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Lines</TableHead></TableRow></TableHeader><TableBody>{data.rows.map((row) => <DataGridRow key={row.id} href={`/stock-wastage/${row.id}`}><TableCell><Link href={`/stock-wastage/${row.id}`} aria-label={`Quick view ${row.wastage_no}`} className="rounded-none p-1 text-[var(--sb-text-soft)] hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-amber-700)]"><Pencil className="h-4 w-4" /></Link></TableCell><TableCell className="font-medium">{row.wastage_no}</TableCell><TableCell>{row.wastage_date}</TableCell><TableCell>{row.location_name ?? "-"}</TableCell><TableCell>{row.reason.replaceAll("_", " ")}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell className="text-right">{row.line_count}</TableCell></DataGridRow>)}{!data.rows.length ? <TableRow><TableCell colSpan={7}><EmptyState title="No wastage found" description="Wastage documents will appear here after damaged, expired, missing, or claimable stock is reported." action={{ href: "/stock-wastage/new", label: "New Wastage" }} /></TableCell></TableRow> : null}</TableBody></Table>
      <PaginationControls page={data.page} totalPages={data.totalPages} totalRows={data.totalRows} searchParams={filters} />
    </div></div></>
  );
}
