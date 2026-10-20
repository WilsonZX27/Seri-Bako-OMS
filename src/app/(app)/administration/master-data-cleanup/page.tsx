import Link from "next/link";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SelectControl } from "@/components/ui/select-control";
import { FilterBar } from "@/components/ui/filter-bar";
import { OperationalList, OperationalListRow, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMasterDataCleanup } from "@/server/queries/master-data-cleanup";
import { hasActiveFilters } from "@/lib/table-state";
import { logServerError } from "@/server/observability/logger";

const severityVariant = { critical: "danger", warning: "warning", info: "secondary" } as const;

export default async function MasterDataCleanupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const report = await getMasterDataCleanup(filters).catch((error) => { logServerError(error, { source: "page.masterDataCleanup.report" }); return null; });
  const filtered = hasActiveFilters(filters);
  return <>
    <PageHeader title="Master Data Cleanup" description="Read-only checks for codes, core fields, references, and branch assignments." />
    <WorkspaceGrid hideMobileConsole rightRail={<>
      <ConsoleSection title="Cleanup guidance"><div className="space-y-2 text-xs text-muted-foreground"><p>This report is read-only.</p><p>Fixes are manual through the linked master record pages.</p><p>No records are merged or deleted here.</p><p>Review suspicious duplicate codes before changing them.</p></div></ConsoleSection>
      <ConsoleSection title="Scope"><p className="text-xs text-muted-foreground">Checks visible items, products, and suppliers only. It never changes stock, production, or finance records.</p></ConsoleSection>
    </>}>
      {!report ? <Card><CardContent className="p-5"><EmptyState title="Cleanup checks unavailable" description="Try again shortly. No master data was changed." /></CardContent></Card> : <div className="space-y-4">
        <MetricStrip
          className="grid-cols-4 sm:grid-cols-4 lg:grid-cols-4"
          items={[
            { label: "Total issues", value: report.summary.total },
            { label: "Critical", value: report.summary.critical },
            { label: "Warnings", value: report.summary.warning },
            { label: "Information", value: report.summary.info },
          ]}
        />
        <div className="space-y-3">
          <FilterBar resultCount={report.issues.length} resetHref="/administration/master-data-cleanup" filtered={filtered}>
            <SelectControl name="severity" defaultValue={filters.severity ?? "all"} ariaLabel="Severity" options={[{ value: "all", label: "All severities" }, { value: "critical", label: "Critical" }, { value: "warning", label: "Warning" }, { value: "info", label: "Information" }]} />
            <SelectControl name="module" defaultValue={filters.module ?? "all"} ariaLabel="Module" options={[{ value: "all", label: "All modules" }, { value: "item", label: "Items" }, { value: "product", label: "Products" }, { value: "supplier", label: "Suppliers" }]} />
            <Button type="submit">Filter</Button>
          </FilterBar>
          <section className="sb-list-content-card overflow-hidden">
          <Table mobileHidden stickyColumn="none" aria-label="Master data cleanup issues">
            <TableHeader><TableRow><TableHead className="w-20 text-center">Open</TableHead><TableHead>Severity</TableHead><TableHead>Module</TableHead><TableHead>Issue</TableHead><TableHead>Record</TableHead><TableHead>Suggested manual action</TableHead></TableRow></TableHeader>
            <TableBody>{report.issues.map((issue) => <TableRow key={issue.id}><TableCell className="text-center"><Button asChild variant="outline" size="sm"><Link href={issue.href}>Open</Link></Button></TableCell><TableCell><Badge variant={severityVariant[issue.severity]}>{issue.severity}</Badge></TableCell><TableCell className="capitalize">{issue.module}</TableCell><TableCell className="font-medium">{issue.issueType}</TableCell><TableCell>{issue.record}</TableCell><TableCell className="text-muted-foreground">{issue.action}</TableCell></TableRow>)}{!report.issues.length ? <TableRow><TableCell colSpan={6}><EmptyState title="No matching cleanup issues" description="Try another filter, or the visible master data is complete for these checks." /></TableCell></TableRow> : null}</TableBody>
          </Table>
            <OperationalList ariaLabel="Master data cleanup issues">{report.issues.map((issue) => <OperationalListRow key={issue.id} href={issue.href} label={`Open ${issue.record}`} primary={issue.record} status={<Badge variant={severityVariant[issue.severity]}>{issue.severity}</Badge>} statusMeta={<span className="capitalize">{issue.module}</span>} secondary={issue.issueType} detail={<>Next: {issue.action}</>} meta="Open record" />)}{!report.issues.length ? <EmptyState title="No matching cleanup issues" description="Try another filter, or the visible master data is complete for these checks." /> : null}</OperationalList>
          </section>
        </div>
      </div>}
    </WorkspaceGrid>
  </>;
}
