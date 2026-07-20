import Link from "next/link";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SelectControl } from "@/components/ui/select-control";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMasterDataCleanup } from "@/server/queries/master-data-cleanup";
import { hasActiveFilters } from "@/lib/table-state";

const severityVariant = { critical: "danger", warning: "warning", info: "secondary" } as const;

export default async function MasterDataCleanupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const report = await getMasterDataCleanup(filters).catch(() => null);
  const filtered = hasActiveFilters(filters);
  return <>
    <PageHeader title="Master Data Cleanup" description="Read-only checks for codes, core fields, references, and branch assignments." />
    <WorkspaceGrid rightRail={<>
      <ConsoleSection title="Cleanup guidance"><div className="space-y-2 text-xs text-muted-foreground"><p>This report is read-only.</p><p>Fixes are manual through the linked master record pages.</p><p>No records are merged or deleted here.</p><p>Review suspicious duplicate codes before changing them.</p></div></ConsoleSection>
      <ConsoleSection title="Scope"><p className="text-xs text-muted-foreground">Checks visible items, products, and suppliers only. It never changes stock, production, or finance records.</p></ConsoleSection>
    </>}>
      {!report ? <Card><CardContent className="p-5"><EmptyState title="Cleanup checks unavailable" description="Try again shortly. No master data was changed." /></CardContent></Card> : <div className="space-y-4">
        <Card><CardContent className="grid gap-3 p-3 sm:grid-cols-4"><Metric label="Total issues" value={report.summary.total} /><Metric label="Critical" value={report.summary.critical} /><Metric label="Warnings" value={report.summary.warning} /><Metric label="Information" value={report.summary.info} /></CardContent></Card>
        <section className="overflow-hidden border bg-card">
          <FilterBar resultCount={report.issues.length} resetHref="/administration/master-data-cleanup" filtered={filtered}>
            <SelectControl name="severity" defaultValue={filters.severity ?? "all"} ariaLabel="Severity" options={[{ value: "all", label: "All severities" }, { value: "critical", label: "Critical" }, { value: "warning", label: "Warning" }, { value: "info", label: "Information" }]} />
            <SelectControl name="module" defaultValue={filters.module ?? "all"} ariaLabel="Module" options={[{ value: "all", label: "All modules" }, { value: "item", label: "Items" }, { value: "product", label: "Products" }, { value: "supplier", label: "Suppliers" }]} />
            <Button type="submit">Filter</Button>
          </FilterBar>
          <Table aria-label="Master data cleanup issues">
            <TableHeader><TableRow><TableHead>Severity</TableHead><TableHead>Module</TableHead><TableHead>Issue</TableHead><TableHead>Record</TableHead><TableHead>Suggested manual action</TableHead><TableHead className="text-right">Open</TableHead></TableRow></TableHeader>
            <TableBody>{report.issues.map((issue) => <TableRow key={issue.id}><TableCell><Badge variant={severityVariant[issue.severity]}>{issue.severity}</Badge></TableCell><TableCell className="capitalize">{issue.module}</TableCell><TableCell className="font-medium">{issue.issueType}</TableCell><TableCell>{issue.record}</TableCell><TableCell className="text-muted-foreground">{issue.action}</TableCell><TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={issue.href}>Open</Link></Button></TableCell></TableRow>)}{!report.issues.length ? <TableRow><TableCell colSpan={6}><EmptyState title="No matching cleanup issues" description="Try another filter, or the visible master data is complete for these checks." /></TableCell></TableRow> : null}</TableBody>
          </Table>
        </section>
      </div>}
    </WorkspaceGrid>
  </>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><strong>{value}</strong></div>;
}
