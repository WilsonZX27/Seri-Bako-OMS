import Link from "next/link";
import { ConsoleSection } from "@/components/layout/right-console";
import { CostingReadinessInsights } from "@/components/reports/costing-readiness-insights";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterBarMore } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import {
  OperationalList,
  OperationalListRow,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasActiveFilters } from "@/lib/table-state";
import { logServerError } from "@/server/observability/logger";
import { getCostingReadiness } from "@/server/queries/costing-readiness";

export const dynamic = "force-dynamic";

const variants = { critical: "danger", warning: "warning", info: "secondary" } as const;

export default async function CostingReadinessPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const report = await getCostingReadiness(filters).catch((error) => {
    logServerError(error, { source: "page.costingReadiness.report" });
    return null;
  });

  const rightRail = <>
    <ConsoleSection title="Costing assumptions">
      <div className="space-y-2 text-xs text-muted-foreground">
        <p>This is readiness only, not product margin.</p>
        <p><strong className="text-foreground">Critical</strong> blocks trustworthy costing. <strong className="text-foreground">Warning</strong> should be fixed before margin review. <strong className="text-foreground">Info</strong> improves data quality.</p>
        <p>Costs are only as reliable as item, supplier, and recipe data.</p>
        <p>No records are changed here; fixes are manual through the linked master pages.</p>
      </div>
    </ConsoleSection>
    <ConsoleSection title="Scope">
      <p className="text-xs text-muted-foreground">Checks current master data and recipe lines only. It does not recalculate costs, prices, stock, production, or finance records.</p>
    </ConsoleSection>
  </>;

  return <>
    <PageHeader title="Costing Readiness" description="Read-only checks for the data needed before trusting future recipe or product costing." />
    <WorkspaceGrid mobileRailSummary="How to read this report" hideMobileConsole rightRail={rightRail} tabletRailMode="split" tabletRailBreakpoint="md">
      {!report ? (
        <Card>
          <CardContent className="p-5">
            <EmptyState title="Costing readiness is unavailable" description="Try again shortly. No costing data was changed." />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-costing-readiness-workspace>
          <FilterBar resultCount={report.issues.length} resetHref="/reports/costing-readiness" filtered={hasActiveFilters(filters)} className="sb-list-filters--balanced [&>select]:!flex-[0_1_10rem]">
            <SelectNative name="severity" defaultValue={filters.severity ?? "all"} aria-label="Issue severity">
              <option value="all">All severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Information</option>
            </SelectNative>
            <FilterBarMore activeCount={filters.module && filters.module !== "all" ? 1 : 0} resetHref="/reports/costing-readiness">
              <SelectNative name="module" defaultValue={filters.module ?? "all"} aria-label="Issue module">
                <option value="all">All modules</option>
                <option value="item">Items</option>
                <option value="supplier_item">Supplier items</option>
                <option value="recipe">Recipes</option>
                <option value="product">Products</option>
              </SelectNative>
            </FilterBarMore>
            <Button type="submit" variant="secondary">Filter</Button>
          </FilterBar>

          <CostingReadinessInsights readiness={report.readiness} modules={report.moduleSummary} severity={filters.severity} />

          <section className="sb-list-content-card overflow-hidden">
            <Table mobileHidden aria-label="Costing readiness issues">
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Suggested manual action</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell><Badge variant={variants[issue.severity]}>{issue.severity}</Badge></TableCell>
                    <TableCell className="capitalize">{issue.module.replace("_", " ")}</TableCell>
                    <TableCell className="font-medium">{issue.record}</TableCell>
                    <TableCell>{issue.reason}</TableCell>
                    <TableCell className="text-muted-foreground">{issue.action}</TableCell>
                    <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={issue.href}>Open</Link></Button></TableCell>
                  </TableRow>
                ))}
                {!report.issues.length ? (
                  <TableRow><TableCell colSpan={6}><EmptyState title="Costing data is ready for review" description="No readiness gaps were detected. This does not calculate product margin." /></TableCell></TableRow>
                ) : null}
              </TableBody>
            </Table>

            <div data-costing-readiness-list>
              <OperationalList ariaLabel="Costing readiness issues">
                {report.issues.map((issue) => (
                  <OperationalListRow
                    key={issue.id}
                    href={issue.href}
                    label={`Open ${issue.record}`}
                    primary={issue.record}
                    status={<Badge variant={variants[issue.severity]}>{issue.severity}</Badge>}
                    statusMeta={<span className="capitalize">{issue.module.replace("_", " ")}</span>}
                    secondary={issue.reason}
                    detail={<>Next: {issue.action}</>}
                    meta="Open record"
                  />
                ))}
                {!report.issues.length ? <EmptyState title="Costing data is ready for review" description="No readiness gaps were detected. This does not calculate product margin." /> : null}
              </OperationalList>
            </div>
          </section>
        </div>
      )}
    </WorkspaceGrid>
  </>;
}
