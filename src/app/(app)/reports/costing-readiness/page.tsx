import Link from "next/link";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCostingReadiness } from "@/server/queries/costing-readiness";

const variants = { critical: "danger", warning: "warning", info: "secondary" } as const;

export default async function CostingReadinessPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const report = await getCostingReadiness(filters).catch(() => null);
  return <>
    <PageHeader title="Costing Readiness" description="Read-only checks for the data needed before trusting future recipe or product costing." />
    <WorkspaceGrid rightRail={<>
      <ConsoleSection title="Costing assumptions"><div className="space-y-2 text-xs text-muted-foreground"><p>This is readiness only, not product margin.</p><p><strong className="text-foreground">Critical</strong> blocks trustworthy costing. <strong className="text-foreground">Warning</strong> should be fixed before margin review. <strong className="text-foreground">Info</strong> improves data quality.</p><p>Costs are only as reliable as item, supplier, and recipe data.</p><p>No records are changed here; fixes are manual through the linked master pages.</p></div></ConsoleSection>
      <ConsoleSection title="Scope"><p className="text-xs text-muted-foreground">Checks current master data and recipe lines only. It does not recalculate costs, prices, stock, production, or finance records.</p></ConsoleSection>
    </>}>
      {!report ? <Card><CardContent className="p-5"><EmptyState title="Costing readiness is unavailable" description="Try again shortly. No costing data was changed." /></CardContent></Card> : <div className="space-y-4">
        <Card><CardContent className="grid gap-3 p-3 sm:grid-cols-5"><Metric label="Readiness" value={report.readiness} /><Metric label="Total issues" value={report.summary.total} /><Metric label="Critical blockers" value={report.summary.critical} /><Metric label="Warnings" value={report.summary.warning} /><Metric label="Information" value={report.summary.info} /></CardContent></Card>
        <section className="overflow-hidden border bg-card"><form className="sb-list-filters"><SelectNative name="severity" defaultValue={filters.severity ?? "all"}><option value="all">All severities</option><option value="critical">Critical</option><option value="warning">Warning</option><option value="info">Information</option></SelectNative><SelectNative name="module" defaultValue={filters.module ?? "all"}><option value="all">All modules</option><option value="item">Items</option><option value="supplier_item">Supplier items</option><option value="recipe">Recipes</option><option value="product">Products</option></SelectNative><Button type="submit" variant="secondary">Filter</Button><Button asChild variant="ghost"><Link href="/reports/costing-readiness">Reset</Link></Button></form><Table aria-label="Costing readiness issues"><TableHeader><TableRow><TableHead>Severity</TableHead><TableHead>Module</TableHead><TableHead>Record</TableHead><TableHead>Reason</TableHead><TableHead>Suggested manual action</TableHead><TableHead className="text-right">Open</TableHead></TableRow></TableHeader><TableBody>{report.issues.map((issue) => <TableRow key={issue.id}><TableCell><Badge variant={variants[issue.severity]}>{issue.severity}</Badge></TableCell><TableCell className="capitalize">{issue.module.replace("_", " ")}</TableCell><TableCell className="font-medium">{issue.record}</TableCell><TableCell>{issue.reason}</TableCell><TableCell className="text-muted-foreground">{issue.action}</TableCell><TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={issue.href}>Open</Link></Button></TableCell></TableRow>)}{!report.issues.length ? <TableRow><TableCell colSpan={6}><EmptyState title="Costing data is ready for review" description="No readiness gaps were detected. This does not calculate product margin." /></TableCell></TableRow> : null}</TableBody></Table></section>
      </div>}
    </WorkspaceGrid>
  </>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><strong>{value}</strong></div>;
}
